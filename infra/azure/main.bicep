// Azure hosting for the live demo: Container Apps for web and api, PostgreSQL Flexible Server for data.
// Deployed by .github/workflows/deploy.yml; see docs/deploy-azure.md for one-time setup.

targetScope = 'resourceGroup'

@description('Short name used as a prefix for every resource.')
@minLength(3)
@maxLength(12)
param name string = 'grouplife'

param location string = resourceGroup().location

@description('Full image reference for the API, for example ghcr.io/owner/grouplife-api:sha.')
param apiImage string

@description('Full image reference for the web app.')
param webImage string

@description('Container registry host the images are pulled from.')
param registryServer string = 'ghcr.io'

@description('Registry user. Leave empty when the images are public.')
param registryUsername string = ''

@secure()
@description('Registry password or token with read access to packages. Leave empty when the images are public.')
param registryPassword string = ''

@description('PostgreSQL administrator login.')
param postgresAdminLogin string = 'grouplifeadmin'

@secure()
@description('PostgreSQL administrator password.')
param postgresAdminPassword string

@secure()
@minLength(32)
@description('HS256 signing key for access tokens: at least 32 random characters.')
param jwtSecret string

@description('Spring profile. "demo" loads the synthetic seed data.')
param springProfile string = 'demo'

var useRegistryCredentials = !empty(registryUsername)
var databaseName = 'grouplife'
var apiAppName = 'ca-${name}-api'

resource logs 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: 'log-${name}'
  location: location
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
  }
}

resource environment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: 'cae-${name}'
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logs.properties.customerId
        sharedKey: logs.listKeys().primarySharedKey
      }
    }
  }
}

resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' = {
  name: 'psql-${name}-${uniqueString(resourceGroup().id)}'
  location: location
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    version: '16'
    administratorLogin: postgresAdminLogin
    administratorLoginPassword: postgresAdminPassword
    storage: { storageSizeGB: 32 }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: { mode: 'Disabled' }
  }
}

resource database 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2024-08-01' = {
  parent: postgres
  name: databaseName
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

// 0.0.0.0 is Azure's convention for "allow other Azure services", which covers Container Apps
// without a virtual network. A production setup would use VNet integration and a private endpoint.
resource allowAzureServices 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2024-08-01' = {
  parent: postgres
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

var registries = useRegistryCredentials
  ? [
      {
        server: registryServer
        username: registryUsername
        passwordSecretRef: 'registry-password'
      }
    ]
  : []

var registrySecrets = useRegistryCredentials ? [{ name: 'registry-password', value: registryPassword }] : []

resource api 'Microsoft.App/containerApps@2024-03-01' = {
  name: apiAppName
  location: location
  properties: {
    managedEnvironmentId: environment.id
    configuration: {
      // Internal only: the API is reached through the web app's nginx proxy.
      ingress: {
        external: false
        targetPort: 8080
        transport: 'http'
        allowInsecure: true
      }
      registries: registries
      secrets: concat(registrySecrets, [
        { name: 'db-password', value: postgresAdminPassword }
        { name: 'jwt-secret', value: jwtSecret }
      ])
    }
    template: {
      containers: [
        {
          name: 'api'
          image: apiImage
          resources: { cpu: json('0.5'), memory: '1Gi' }
          env: [
            { name: 'DB_URL', value: 'jdbc:postgresql://${postgres.properties.fullyQualifiedDomainName}:5432/${databaseName}?sslmode=require' }
            { name: 'DB_USERNAME', value: postgresAdminLogin }
            { name: 'DB_PASSWORD', secretRef: 'db-password' }
            { name: 'JWT_SECRET', secretRef: 'jwt-secret' }
            { name: 'SPRING_PROFILES_ACTIVE', value: springProfile }
            // Ingress exposes a single port, and it is internal, so actuator shares it here.
            { name: 'MANAGEMENT_PORT', value: '8080' }
          ]
          probes: [
            {
              type: 'Startup'
              httpGet: { path: '/actuator/health/liveness', port: 8080 }
              initialDelaySeconds: 10
              periodSeconds: 5
              failureThreshold: 30
            }
            {
              type: 'Liveness'
              httpGet: { path: '/actuator/health/liveness', port: 8080 }
              periodSeconds: 15
            }
            {
              type: 'Readiness'
              httpGet: { path: '/actuator/health/readiness', port: 8080 }
              periodSeconds: 10
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 1
      }
    }
  }
  dependsOn: [
    database
    allowAzureServices
  ]
}

resource web 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'ca-${name}-web'
  location: location
  properties: {
    managedEnvironmentId: environment.id
    configuration: {
      ingress: {
        external: true
        targetPort: 80
        transport: 'auto'
        allowInsecure: false
      }
      registries: registries
      secrets: registrySecrets
    }
    template: {
      containers: [
        {
          name: 'web'
          image: webImage
          resources: { cpu: json('0.25'), memory: '0.5Gi' }
          env: [
            { name: 'API_UPSTREAM', value: 'http://${apiAppName}' }
            { name: 'HEALTH_UPSTREAM', value: 'http://${apiAppName}' }
          ]
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 2
      }
    }
  }
  dependsOn: [
    api
  ]
}

@description('Public URL of the live demo.')
output webUrl string = 'https://${web.properties.configuration.ingress.fqdn}'
