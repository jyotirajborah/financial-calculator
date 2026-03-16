// Fixed render functions
const renderProperties = () => {
    const grid = document.getElementById('properties-grid');
    if (!grid) return;
    
    const marketMultiplier = getMarketMultiplier();
    
    grid.innerHTML = properties.map(prop => {
        const propState = gameState.playerProperties[prop.id];
        const isOwned = propState.owned;
        const currentPrice = Math.round(prop.price * marketMultiplier);
        
        return `
            <div class="property-card ${isOwned ? 'owned' : ''}" style="cursor: ${isOwned ? 'default' : 'pointer'};">
                <div class="property-name">${prop.name}</div>
                <div class="property-price">💰 $${currentPrice}</div>
                <div class="property-income">📈 Rent: $${prop.rent}/mo</div>
                <div class="property-maintenance">🔧 Maint: $${prop.maintenance}/mo</div>
                <div class="property-risk">⚠️ Risk: ${prop.riskLevel}</div>
                ${isOwned ? `
                    <div class="property-condition" style="color: ${propState.condition > 70 ? '#10b981' : propState.condition > 40 ? '#f59e0b' : '#ef4444'};">
                        🏠 Condition: ${propState.condition}%
                    </div>
                    ${propState.hasVacancy ? `<div style="color: #ef4444;">🚫 VACANT (${propState.monthsVacant} mo)</div>` : ''}
                ` : `
                    <button class="btn-small" onclick="buyProperty(${prop.id})" ${gameState.playerCash < currentPrice && gameState.playerDebt > 1000 ? 'disabled' : ''}>
                        ${gameState.playerCash >= currentPrice ? 'Buy' : 'Buy (Loan)'}
                    </button>
                `}
            </div>
        `;
    }).join('');
};

const renderYourProperties = () => {
    const container = document.getElementById('your-properties');
    if (!container) return;
    
    const yourProps = properties.filter(p => gameState.playerProperties[p.id].owned);
    
    if (yourProps.length === 0) {
        container.innerHTML = '<p class="empty-state">No properties yet. Buy some to start building your empire!</p>';
        return;
    }
    
    const marketMultiplier = getMarketMultiplier();
    
    container.innerHTML = yourProps.map(prop => {
        const propState = gameState.playerProperties[prop.id];
