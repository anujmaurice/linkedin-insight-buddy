
class LinkedInAnalyzer {
    constructor() {
        this.initializeElements();
        this.bindEvents();
        this.loadAnalysis();
    }

    initializeElements() {
        this.loadingEl = document.getElementById('loading');
        this.errorEl = document.getElementById('error');
        this.resultsEl = document.getElementById('results');
        this.summaryEl = document.getElementById('summary');
        this.sentimentBadgeEl = document.getElementById('sentiment-badge');
        this.sentimentDetailsEl = document.getElementById('sentiment-details');
        this.insightsEl = document.getElementById('insights');
        this.analyzeBtn = document.getElementById('analyze-btn');
    }

    bindEvents() {
        this.analyzeBtn.addEventListener('click', () => {
            this.analyzeCurrentPage();
        });
    }

    async loadAnalysis() {
        try {
            const result = await chrome.storage.local.get(['linkedinAnalysis']);
            if (result.linkedinAnalysis) {
                this.displayResults(result.linkedinAnalysis);
            } else {
                this.analyzeCurrentPage();
            }
        } catch (error) {
            console.error('Error loading analysis:', error);
            this.showError();
        }
    }

    async analyzeCurrentPage() {
        this.showLoading();

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab.url.includes('linkedin.com')) {
                this.showError();
                return;
            }

            const results = await chrome.tabs.sendMessage(tab.id, { action: 'analyze' });
            
            if (results && results.success) {
                await chrome.storage.local.set({ linkedinAnalysis: results.data });
                this.displayResults(results.data);
            } else {
                this.showError();
            }
        } catch (error) {
            console.error('Error analyzing page:', error);
            this.showError();
        }
    }

    showLoading() {
        this.loadingEl.style.display = 'block';
        this.errorEl.style.display = 'none';
        this.resultsEl.style.display = 'none';
    }

    showError() {
        this.loadingEl.style.display = 'none';
        this.errorEl.style.display = 'flex';
        this.resultsEl.style.display = 'none';
    }

    displayResults(data) {
        this.loadingEl.style.display = 'none';
        this.errorEl.style.display = 'none';
        this.resultsEl.style.display = 'flex';

        // Display summary
        this.summaryEl.textContent = data.summary;

        // Display sentiment
        this.updateSentiment(data.sentiment);

        // Display insights
        this.displayInsights(data.insights);
    }

    updateSentiment(sentiment) {
        const sentimentMap = {
            positive: { emoji: '😊', text: 'Positive', class: 'sentiment-positive' },
            negative: { emoji: '😔', text: 'Negative', class: 'sentiment-negative' },
            neutral: { emoji: '😐', text: 'Neutral', class: 'sentiment-neutral' }
        };

        const config = sentimentMap[sentiment.label] || sentimentMap.neutral;
        
        this.sentimentBadgeEl.className = `sentiment-badge ${config.class}`;
        this.sentimentBadgeEl.innerHTML = `${config.emoji} ${config.text}`;
        this.sentimentDetailsEl.textContent = `Confidence: ${(sentiment.score * 100).toFixed(1)}%`;
    }

    displayInsights(insights) {
        this.insightsEl.innerHTML = '';
        insights.forEach(insight => {
            const li = document.createElement('li');
            li.textContent = insight;
            this.insightsEl.appendChild(li);
        });
    }
}

// Initialize the analyzer when the popup loads
document.addEventListener('DOMContentLoaded', () => {
    new LinkedInAnalyzer();
});
