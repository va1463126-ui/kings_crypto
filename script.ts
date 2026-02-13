interface ShareData {
    soldShares: number;
    totalShares: number;
    priceHistory: number[];
}

class FundingTracker {
    private soldShares: number = 0;
    private totalShares: number = 100;
    private priceHistory: number[] = [];
    private readonly MAX_SHARES: number = 100;
    private readonly START_PRICE: number = 3;      // سعر أول سهم
    private readonly END_PRICE: number = 550;       // سعر آخر سهم

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
            this.priceHistory.push(this.START_PRICE);
        }
    }

    private saveToStorage(): void {
        const data: ShareData = {
            soldShares: this.soldShares,
            totalShares: this.totalShares,
            priceHistory: this.priceHistory
        };
        localStorage.setItem('fundingData', JSON.stringify(data));
    }

    private getCurrentPrice(): number {
        if (this.soldShares === 0) return this.START_PRICE;
        
        // حساب السعر الحالي بناءً على عدد الأسهم المباعة
        // المعادلة: السعر يزيد تدريجياً من 3 إلى 550 خلال 100 سهم
        
        // في حالة السهم الأخير (99 مباعة + السهم الحالي = 100)
        if (this.soldShares >= this.MAX_SHARES) {
            return this.END_PRICE;
        }
        
        // معادلة الزيادة التدريجية
        // الفرق بين السعر النهائي والبداية = 547
        // مقسم على 99 خطوة (من السهم 1 للسهم 100)
        const priceIncreasePerShare = (this.END_PRICE - this.START_PRICE) / (this.MAX_SHARES - 1);
        
        // حساب السعر: سعر البداية + (عدد الأسهم المباعة * الزيادة)
        // نطرح 1 لأن أول سهم سعره 3 (زيادة 0)
        const currentPrice = this.START_PRICE + ((this.soldShares) * priceIncreasePerShare);
        
        return Math.round(currentPrice * 100) / 100; // تقريب لرقمين عشريين
    }

    private getPriceForNextShare(): number {
        // السعر اللي هيدفعوه لو اشتروا السهم الجاي
        if (this.soldShares >= this.MAX_SHARES) {
            return this.END_PRICE;
        }
        
        const priceIncreasePerShare = (this.END_PRICE - this.START_PRICE) / (this.MAX_SHARES - 1);
        const nextPrice = this.START_PRICE + ((this.soldShares + 1) * priceIncreasePerShare);
        
        return Math.round(nextPrice * 100) / 100;
    }

    private getRemainingShares(): number {
        return this.totalShares - this.soldShares;
    }

    private getTotalValue(): number {
        // إجمالي قيمة الأسهم المباعة
        let total = 0;
        for (let i = 0; i < this.soldShares; i++) {
            const priceAtThatTime = this.START_PRICE + (i * (this.END_PRICE - this.START_PRICE) / (this.MAX_SHARES - 1));
            total += priceAtThatTime;
        }
        return Math.round(total * 100) / 100;
    }

    private buyShare(): boolean {
        if (this.soldShares >= this.MAX_SHARES) {
            this.showMessage('للأسف، تم بيع جميع الأسهم!', 'error');
            return false;
        }

        const priceBeforeBuy = this.getCurrentPrice();
        this.soldShares++;
        const newPrice = this.getCurrentPrice();
        
        // نسجل عملية الشراء في التاريخ
        this.priceHistory.push(priceBeforeBuy);
        
        this.saveToStorage();
        this.updateDisplay();
        this.showMessage(
            `✅ تم شراء السهم بسعر $${priceBeforeBuy.toFixed(2)}\n` +
            `💰 السعر الجديد: $${newPrice.toFixed(2)}`, 
            'success'
        );
        
        return true;
    }

    private updateDisplay(): void {
        // تحديث العناصر في الصفحة
        const soldElement = document.getElementById('sold-shares');
        const remainingElement = document.getElementById('remaining-shares');
        const currentPriceElement = document.getElementById('current-price');
        const buyPriceElement = document.getElementById('buy-price');
        const totalValueElement = document.getElementById('total-value');
        const buyButton = document.getElementById('buy-button') as HTMLButtonElement;

        const currentPrice = this.getCurrentPrice();
        const nextPrice = this.getPriceForNextShare();
        const remainingShares = this.getRemainingShares();
        const totalValue = this.getTotalValue();

        if (soldElement) {
            soldElement.textContent = this.soldShares.toString();
        }
        
        if (remainingElement) {
            remainingElement.textContent = remainingShares.toString();
        }
        
        if (currentPriceElement) {
            currentPriceElement.textContent = `$${currentPrice.toFixed(2)}`;
        }
        
        if (buyPriceElement) {
            if (remainingShares > 0) {
                buyPriceElement.textContent = `$${nextPrice.toFixed(2)} (للسهم القادم)`;
            } else {
                buyPriceElement.textContent = 'تم البيع بالكامل';
            }
        }

        if (totalValueElement) {
            totalValueElement.textContent = `$${totalValue.toFixed(2)}`;
        }

        if (buyButton) {
            buyButton.disabled = this.soldShares >= this.MAX_SHARES;
            if (this.soldShares >= this.MAX_SHARES) {
                buyButton.textContent = 'نفذت الأسهم';
            } else {
                buyButton.textContent = `شراء سهم واحد ($${nextPrice.toFixed(2)})`;
            }
        }

        this.updatePriceHistory();
    }

    private updatePriceHistory(): void {
        const historyElement = document.getElementById('price-history');
        if (!historyElement) return;

        historyElement.innerHTML = '';
        
        // عرض آخر 10 عمليات شراء
        const recentPurchases = this.priceHistory.slice(-10);
        
        if (recentPurchases.length === 0) {
            historyElement.innerHTML = '<p class="no-data">لا توجد مشتريات بعد</p>';
            return;
        }
        
        recentPurchases.forEach((price, index) => {
            const item = document.createElement('div');
            item.className = 'history-item';
            const shareNumber = this.priceHistory.length - recentPurchases.length + index + 1;
            item.innerHTML = `
                <span>السهم #${shareNumber}</span>
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
        messageElement.style.display = 'block';
        
        setTimeout(() => {
            messageElement.style.display = 'none';
        }, 4000);
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
