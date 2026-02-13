interface ShareData {
    soldShares: number;
    totalShares: number;
    currentPrice: number;
    priceHistory: number[];
}

class FundingTracker {
    private soldShares: number = 0;
    private totalShares: number = 100;
    private basePrice: number = 10;
    private priceHistory: number[] = [];
    private readonly MAX_SHARES: number = 100;

    constructor() {
        this.loadFromStorage();
        this.updateDisplay();
        this.setupEventListeners();
    }

    private loadFromStorage(): void {
        const saved = localStorage.getItem('fundingData');
        if (saved) {
            const data: ShareData = JSON.parse(saved);
            this.soldShares = data.soldShares;
            this.priceHistory = data.priceHistory;
        } else {
            // إذا كان أول مرة، نضيف السعر الابتدائي للتاريخ
            this.priceHistory.push(this.basePrice);
        }
    }

    private saveToStorage(): void {
        const data: ShareData = {
            soldShares: this.soldShares,
            totalShares: this.totalShares,
            currentPrice: this.getCurrentPrice(),
            priceHistory: this.priceHistory
        };
        localStorage.setItem('fundingData', JSON.stringify(data));
    }

    private getCurrentPrice(): number {
        // السعر يزيد مع كل سهم يتم بيعه
        return this.basePrice + (this.soldShares * 0.5);
    }

    private getRemainingShares(): number {
        return this.totalShares - this.soldShares;
    }

    private buyShare(): boolean {
        if (this.soldShares >= this.MAX_SHARES) {
            this.showMessage('للأسف، تم بيع جميع الأسهم!', 'error');
            return false;
        }

        this.soldShares++;
        const newPrice = this.getCurrentPrice();
        this.priceHistory.push(newPrice);
        
        this.saveToStorage();
        this.updateDisplay();
        this.showMessage(`تم شراء السهم بنجاح! السعر الجديد: $${newPrice.toFixed(2)}`, 'success');
        
        return true;
    }

    private updateDisplay(): void {
        // تحديث العناصر في الصفحة
        const soldElement = document.getElementById('sold-shares');
        const remainingElement = document.getElementById('remaining-shares');
        const currentPriceElement = document.getElementById('current-price');
        const buyPriceElement = document.getElementById('buy-price');
        const buyButton = document.getElementById('buy-button') as HTMLButtonElement;

        if (soldElement) {
            soldElement.textContent = this.soldShares.toString();
        }
        
        if (remainingElement) {
            remainingElement.textContent = this.getRemainingShares().toString();
        }
        
        const currentPrice = this.getCurrentPrice();
        if (currentPriceElement) {
            currentPriceElement.textContent = `$${currentPrice.toFixed(2)}`;
        }
        
        if (buyPriceElement) {
            buyPriceElement.textContent = `$${currentPrice.toFixed(2)}`;
        }

        if (buyButton) {
            buyButton.disabled = this.soldShares >= this.MAX_SHARES;
        }

        this.updatePriceHistory();
    }

    private updatePriceHistory(): void {
        const historyElement = document.getElementById('price-history');
        if (!historyElement) return;

        historyElement.innerHTML = '';
        
        // عرض آخر 10 أسعار
        const recentPrices = this.priceHistory.slice(-10);
        
        recentPrices.forEach((price, index) => {
            const item = document.createElement('div');
            item.className = 'history-item';
            item.innerHTML = `
                <span>السهم ${index + 1}</span>
                <span>$${price.toFixed(2)}</span>
            `;
            historyElement.appendChild(item);
        });
    }

    private showMessage(text: string, type: 'success' | 'error'): void {
        const messageElement = document.getElementById('message');
        if (!messageElement) return;

        messageElement.textContent = text;
        messageElement.className = `message ${type}`;
        
        setTimeout(() => {
            messageElement.style.display = 'none';
        }, 3000);
    }

    private setupEventListeners(): void {
        const buyButton = document.getElementById('buy-button');
        if (buyButton) {
            buyButton.addEventListener('click', () => this.buyShare());
        }
    }
}

// بدء التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    new FundingTracker();
});
