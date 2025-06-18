
class LinkedInPageAnalyzer {
    constructor() {
        this.isLinkedIn = window.location.hostname.includes('linkedin.com');
        this.setupMessageListener();
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'analyze') {
                this.analyzePage().then(result => {
                    sendResponse(result);
                }).catch(error => {
                    console.error('Analysis error:', error);
                    sendResponse({ success: false, error: error.message });
                });
                return true; // Keep the message channel open for async response
            }
        });
    }

    async analyzePage() {
        if (!this.isLinkedIn) {
            throw new Error('Not a LinkedIn page');
        }

        const content = this.extractPageContent();
        const analysis = await this.performAnalysis(content);

        return {
            success: true,
            data: {
                summary: analysis.summary,
                sentiment: analysis.sentiment,
                insights: analysis.insights,
                timestamp: new Date().toISOString()
            }
        };
    }

    extractPageContent() {
        const content = {
            pageType: this.detectPageType(),
            text: '',
            title: document.title,
            url: window.location.href
        };

        // Extract different content based on page type
        if (content.pageType === 'profile') {
            content.text = this.extractProfileContent();
        } else if (content.pageType === 'feed') {
            content.text = this.extractFeedContent();
        } else if (content.pageType === 'post') {
            content.text = this.extractPostContent();
        } else {
            content.text = this.extractGeneralContent();
        }

        return content;
    }

    detectPageType() {
        const url = window.location.pathname;
        if (url.includes('/in/')) return 'profile';
        if (url.includes('/feed/')) return 'feed';
        if (url.includes('/posts/')) return 'post';
        if (url === '/' || url === '/feed') return 'feed';
        return 'other';
    }

    extractProfileContent() {
        const selectors = [
            '.text-heading-xlarge', // Name
            '.text-body-medium.break-words', // Headline
            '.display-flex.ph5.pv3', // About section
            '.pvs-list__outer-container', // Experience, Education
            '.artdeco-card.pv3.ph3' // Skills, etc.
        ];

        return this.extractTextFromSelectors(selectors);
    }

    extractFeedContent() {
        const selectors = [
            '.feed-shared-text span[dir="ltr"]', // Post text
            '.feed-shared-header__title', // Author names
            '.feed-shared-text .break-words', // Post content
            '.feed-shared-article__title' // Article titles
        ];

        return this.extractTextFromSelectors(selectors);
    }

    extractPostContent() {
        const selectors = [
            '.feed-shared-text span[dir="ltr"]',
            '.feed-shared-header__title',
            '.feed-shared-article__title',
            '.feed-shared-article__description'
        ];

        return this.extractTextFromSelectors(selectors);
    }

    extractGeneralContent() {
        // Fallback content extraction
        const mainContent = document.querySelector('main') || document.body;
        const textContent = mainContent.innerText || '';
        
        // Clean and limit the content
        return textContent
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 3000); // Limit to 3000 chars
    }

    extractTextFromSelectors(selectors) {
        let text = '';
        
        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                const elementText = el.innerText || el.textContent || '';
                if (elementText.trim()) {
                    text += elementText.trim() + ' ';
                }
            });
        });

        return text.trim().substring(0, 3000); // Limit content
    }

    async performAnalysis(content) {
        // Simple rule-based analysis for now
        const text = content.text.toLowerCase();
        
        // Generate summary
        const summary = this.generateSummary(content);
        
        // Analyze sentiment
        const sentiment = this.analyzeSentiment(text);
        
        // Generate insights
        const insights = this.generateInsights(content);

        return { summary, sentiment, insights };
    }

    generateSummary(content) {
        const text = content.text;
        
        if (content.pageType === 'profile') {
            return this.summarizeProfile(text);
        } else if (content.pageType === 'feed') {
            return this.summarizeFeed(text);
        } else if (content.pageType === 'post') {
            return this.summarizePost(text);
        }
        
        // Generic summary
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
        return sentences.slice(0, 2).join('. ').trim() + '.';
    }

    summarizeProfile(text) {
        const words = text.split(' ');
        if (words.length < 10) {
            return "This LinkedIn profile contains limited information.";
        }
        
        // Extract key professional terms
        const professionalTerms = this.extractProfessionalTerms(text);
        const summary = `Professional profile featuring ${professionalTerms.slice(0, 3).join(', ')}`;
        
        return summary + ". " + text.split('.')[0] + ".";
    }

    summarizeFeed(text) {
        const posts = text.split(/(?=\w+\s+\w+\s+posted|shared)/);
        return `LinkedIn feed containing ${posts.length} posts covering professional updates, industry insights, and networking activities.`;
    }

    summarizePost(text) {
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 5);
        return sentences.slice(0, 1).join('. ').trim() + '.';
    }

    analyzeSentiment(text) {
        const positiveWords = ['great', 'excellent', 'amazing', 'successful', 'achieved', 'growth', 'opportunity', 'excited', 'proud', 'innovative'];
        const negativeWords = ['difficult', 'challenge', 'problem', 'unfortunately', 'failed', 'issue', 'concern', 'disappointing'];
        
        let positiveCount = 0;
        let negativeCount = 0;
        
        positiveWords.forEach(word => {
            if (text.includes(word)) positiveCount++;
        });
        
        negativeWords.forEach(word => {
            if (text.includes(word)) negativeCount++;
        });
        
        if (positiveCount > negativeCount) {
            return { label: 'positive', score: 0.7 + (positiveCount * 0.05) };
        } else if (negativeCount > positiveCount) {
            return { label: 'negative', score: 0.6 + (negativeCount * 0.05) };
        } else {
            return { label: 'neutral', score: 0.5 };
        }
    }

    generateInsights(content) {
        const insights = [];
        const text = content.text.toLowerCase();
        
        // Page type insight
        insights.push(`Page type: ${content.pageType.charAt(0).toUpperCase() + content.pageType.slice(1)}`);
        
        // Content length insight
        const wordCount = content.text.split(' ').length;
        insights.push(`Content length: ${wordCount} words`);
        
        // Professional terms
        const professionalTerms = this.extractProfessionalTerms(text);
        if (professionalTerms.length > 0) {
            insights.push(`Key topics: ${professionalTerms.slice(0, 3).join(', ')}`);
        }
        
        // Activity indicators
        if (text.includes('posted') || text.includes('shared')) {
            insights.push('Recent activity detected');
        }
        
        if (text.includes('connection') || text.includes('network')) {
            insights.push('Networking content present');
        }
        
        return insights;
    }

    extractProfessionalTerms(text) {
        const terms = [
            'management', 'leadership', 'strategy', 'marketing', 'sales', 'technology',
            'engineering', 'design', 'finance', 'operations', 'consulting', 'innovation',
            'development', 'analytics', 'project', 'team', 'business', 'startup',
            'entrepreneur', 'ai', 'machine learning', 'data science', 'software'
        ];
        
        return terms.filter(term => text.includes(term));
    }
}

// Initialize the content script
new LinkedInPageAnalyzer();
