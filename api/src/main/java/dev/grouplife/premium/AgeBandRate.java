package dev.grouplife.premium;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;

@Entity
@Table(name = "age_band_rate")
public class AgeBandRate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private int minAge;
    private int maxAge;
    private BigDecimal monthlyRate;

    protected AgeBandRate() {}

    RateTable.Band toBand() {
        return new RateTable.Band(minAge, maxAge, monthlyRate);
    }
}
