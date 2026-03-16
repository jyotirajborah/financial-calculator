// Comprehensive country data generation functions

const estimateGDP = (country) => {
    const pop = country.population;
    if (pop > 1000000000) return (Math.random() * 20 + 5).toFixed(2);
    if (pop > 100000000) return (Math.random() * 5 + 1).toFixed(2);
    if (pop > 50000000) return (Math.random() * 2 + 0.5).toFixed(2);
    if (pop > 10000000) return (Math.random() * 1 + 0.1).toFixed(2);
    return (Math.random() * 0.5 + 0.01).toFixed(2);
};

const estimateGrowth = (country) => {
    const region = country.region;
    if (region === 'Asia') return (Math.random() * 8 - 1).toFixed(1);
    if (region === 'Africa') return (Math.random() * 6 - 1).toFixed(1);
    if (region === 'Europe') return (Math.random() * 4 - 1).toFixed(1);
    return (Math.random() * 5 - 1).toFixed(1);
};

const estimateDebt = (country) => {
    return Math.floor(Math.random() * 150 + 20);
};

const estimateInflation = (country) => {
    return (Math.random() * 15 + 1).toFixed(1);
};

const estimateUnemployment = (country) => {
    return (Math.random() * 20 + 2).toFixed(1);
};

const estimateRating = (country) => {
    const ratings = ['AAA', 'AA+', 'AA', 'AA-', 'A+', 'A', 'A-', 'BBB+', 'BBB', 'BBB-', 'BB+', 'BB', 'BB-', 'B+', 'B', 'B-'];
    const region = country.region;
    if (region === 'Europe') return ratings[Math.floor(Math.random() * 8)];
    if (region === 'Asia') return ratings[Math.floor(Math.random() * 12)];
    return ratings[Math.floor(Math.random() * ratings.length)];
};
