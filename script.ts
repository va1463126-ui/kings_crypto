interface ShareData {
    soldShares: number;
    totalShares: number;
    priceHistory: number[];
    withdrawals: WithdrawalRecord[];
    totalWithdrawn: number;
}

interface WithdrawalRecord {
    amount: number;
    address: string;
    timestamp: number;
}

interface StockData {
    symbol: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
    volume: string;
}

class FundingTracker {
    private soldShares: number = 0;
    private totalShares: number = 100;
    private priceHistory: number[] = [];
    private withdrawals: WithdrawalRecord[] = [];
    private totalWithdrawn: number = 0;
    private readonly MAX_SHARES: number = 100;
    private readonly START_PRICE: number = 3;      // سعر أول سهم
    private readonly END_PRICE: number = 550;       // سعر آخر سهم
    private stocks: StockData[] = [];
    private stockUpdateInterval: number | null = null;

    constructor() {
        this.loadFromStorage();
        this.initializeStocks();
        this.updateDisplay();
        this.setupEventListeners();
        this.startStockUpdates();
    }

    private loadFromStorage(): void {
        const saved = localStorage.getItem('fundingData');
        if (saved) {
            const data: ShareData = JSON.parse(saved);
            this.soldShares = data.soldShares;
            this.priceHistory = data.priceHistory;
            this.withdrawals = data.withdrawals || [];
            this.totalWithdrawn = data.totalWithdrawn || 0;
        } else {
            // إذا كان أول مرة، نضيف السعر الابتدائي للتاريخ
            this.priceHistory.push(this.START_PRICE);
        }
    }

    private saveToStorage(): void {
        const data: ShareData = {
            soldShares: this.soldShares,
            totalShares: this.totalShares,
            priceHistory: this.priceHistory,
            withdrawals: this.withdrawals,
            totalWithdrawn: this.totalWithdrawn
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

        const withdrawButton = document.getElementById('withdraw-button');
        if (withdrawButton) {
            withdrawButton.addEventListener('click', () => this.showWithdrawalForm());
        }

        const withdrawalForm = document.getElementById('withdrawal-form');
        if (withdrawalForm) {
            withdrawalForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.processWithdrawal();
            });
        }

        const cancelWithdraw = document.getElementById('cancel-withdraw');
        if (cancelWithdraw) {
            cancelWithdraw.addEventListener('click', () => this.hideWithdrawalForm());
        }
    }

    private initializeStocks(): void {
        this.stocks = [
            {
                symbol: 'BTC',
                name: 'بيتكوين',
                price: 45230.50,
                change: 1245.30,
                changePercent: 2.83,
                volume: '24.5B'
            },
            {
                symbol: 'ETH',
                name: 'إيثيريوم',
                price: 2840.75,
                change: -85.20,
                changePercent: -2.91,
                volume: '12.3B'
            },
            {
                symbol: 'BNB',
                name: 'بينانس كوين',
                price: 325.40,
                change: 12.50,
                changePercent: 3.99,
                volume: '1.8B'
            },
            {
                symbol: 'XRP',
                name: 'ريبل',
                price: 0.58,
                change: 0.03,
                changePercent: 5.45,
                volume: '890M'
            }
        ];
        
        // Store initial prices for accurate percentage calculation
        this.stocks.forEach(stock => {
            (stock as any).initialPrice = stock.price;
        });
        
        this.updateStocksDisplay();
    }

    private startStockUpdates(): void {
        // تحديث الأسعار كل 5 ثواني
        this.stockUpdateInterval = window.setInterval(() => {
            this.stocks.forEach(stock => {
                // محاكاة تغيير السعر بنسبة عشوائية
                const changePercent = (Math.random() - 0.5) * 2; // -1% to +1%
                const priceChange = stock.price * (changePercent / 100);
                stock.price += priceChange;
                
                // حساب التغيير بناءً على السعر الأصلي
                const initialPrice = (stock as any).initialPrice || stock.price;
                stock.change = stock.price - initialPrice;
                stock.changePercent = (stock.change / initialPrice) * 100;
            });
            this.updateStocksDisplay();
        }, 5000);
    }

    public destroy(): void {
        // تنظيف الموارد عند إزالة المثيل
        if (this.stockUpdateInterval !== null) {
            window.clearInterval(this.stockUpdateInterval);
            this.stockUpdateInterval = null;
        }
    }

    private updateStocksDisplay(): void {
        const stocksGrid = document.getElementById('stocks-grid');
        if (!stocksGrid) return;

        stocksGrid.innerHTML = '';
        
        this.stocks.forEach(stock => {
            const stockCard = document.createElement('div');
            stockCard.className = 'stock-card';
            
            const changeClass = stock.change >= 0 ? 'positive' : 'negative';
            const changeSymbol = stock.change >= 0 ? '▲' : '▼';
            
            stockCard.innerHTML = `
                <div class="stock-header">
                    <span class="stock-name">${stock.name}</span>
                    <span class="stock-symbol">${stock.symbol}</span>
                </div>
                <div class="stock-price">$${stock.price.toFixed(2)}</div>
                <div class="stock-change ${changeClass}">
                    <span>${changeSymbol}</span>
                    <span>$${Math.abs(stock.change).toFixed(2)} (${Math.abs(stock.changePercent).toFixed(2)}%)</span>
                </div>
                <div class="stock-info">
                    <span>الحجم: ${stock.volume}</span>
                    <span>24س</span>
                </div>
            `;
            
            stocksGrid.appendChild(stockCard);
        });
    }

    private showWithdrawalForm(): void {
        const withdrawalCard = document.getElementById('withdrawal-card');
        if (withdrawalCard) {
            withdrawalCard.style.display = 'block';
            withdrawalCard.scrollIntoView({ behavior: 'smooth' });
        }
    }

    private hideWithdrawalForm(): void {
        const withdrawalCard = document.getElementById('withdrawal-card');
        if (withdrawalCard) {
            withdrawalCard.style.display = 'none';
        }
        
        // إعادة تعيين النموذج
        const form = document.getElementById('withdrawal-form') as HTMLFormElement;
        if (form) {
            form.reset();
        }
    }

    private processWithdrawal(): void {
        const amountInput = document.getElementById('withdraw-amount') as HTMLInputElement;
        const addressInput = document.getElementById('wallet-address') as HTMLInputElement;
        
        if (!amountInput || !addressInput) return;
        
        const amount = parseFloat(amountInput.value);
        const address = addressInput.value.trim();
        
        // التحقق من المبلغ المتاح
        const availableBalance = this.getTotalValue() - this.totalWithdrawn;
        
        if (amount <= 0) {
            this.showMessage('يرجى إدخال مبلغ صحيح', 'error');
            return;
        }
        
        if (amount > availableBalance) {
            this.showMessage(`المبلغ المتاح للسحب: $${availableBalance.toFixed(2)} فقط`, 'error');
            return;
        }
        
        // تحقق بسيط من عنوان المحفظة (يمكن تحسينه لاحقاً)
        // ملاحظة: هذا تحقق أساسي فقط للعرض التوضيحي
        if (!address || address.length < 10) {
            this.showMessage('يرجى إدخال عنوان محفظة صحيح (10 أحرف على الأقل)', 'error');
            return;
        }
        
        // تسجيل عملية السحب
        const withdrawal: WithdrawalRecord = {
            amount: amount,
            address: address,
            timestamp: Date.now()
        };
        
        this.withdrawals.push(withdrawal);
        this.totalWithdrawn += amount;
        this.saveToStorage();
        
        this.showMessage(
            `✅ تم تسجيل طلب السحب بنجاح!\n` +
            `💰 المبلغ: $${amount.toFixed(2)}\n` +
            `📍 سيتم التحويل إلى: ${address.substring(0, 15)}...`,
            'success'
        );
        
        this.hideWithdrawalForm();
        this.updateDisplay();
    }
}

// بدء التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    new FundingTracker();
});
