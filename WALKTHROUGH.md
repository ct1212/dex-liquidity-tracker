# DEX Liquidity Tracker - Signal Panel Walkthrough

This document provides a comprehensive walkthrough of all 10 signal panels in the DEX Liquidity Tracker dashboard, explaining what each panel does, how it works, and how to interpret the signals.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Signal Panels](#signal-panels)
   - [1. Whisper Number Tracker](#1-whisper-number-tracker)
   - [2. Crowded Trade Exit Signal](#2-crowded-trade-exit-signal)
   - [3. Small Cap Smart Money](#3-small-cap-smart-money)
   - [4. Fear Compression Scan](#4-fear-compression-scan)
   - [5. Macro to Micro Translation](#5-macro-to-micro-translation)
   - [6. Management Credibility Signal](#6-management-credibility-signal)
   - [7. Early Meme Formation Detector](#7-early-meme-formation-detector)
   - [8. Regulatory Tailwind Radar](#8-regulatory-tailwind-radar)
   - [9. Global Edge Finder](#9-global-edge-finder)
   - [10. Future Price Path Simulation](#10-future-price-path-simulation)
4. [Interpreting Signal Classifications](#interpreting-signal-classifications)
5. [Using the Dashboard Effectively](#using-the-dashboard-effectively)
6. [Advanced Usage](#advanced-usage)

---

## Getting Started

### Prerequisites

Before starting this walkthrough, ensure you have:

1. Installed all dependencies: `npm install`
2. Configured your `.env` file (see [README.md](README.md) for details)
3. Started the application: `npm run dev`
4. Opened the dashboard in your browser: http://localhost:5173

### Demo vs. Real Mode

This walkthrough works in both modes:

- **Mock Mode** (`MODE=mock` in `.env`): Uses realistic demo data, no API keys required
- **Real Mode** (`MODE=real` in `.env`): Connects to live APIs for real-time data

When running in mock mode, a yellow banner appears at the top of the dashboard.

---

## Dashboard Overview

The main dashboard consists of:

1. **Header**: Application title and ticker input field
2. **Demo Banner**: Visible only in mock mode
3. **Signal Grid**: 10 panels arranged in a responsive grid layout
4. **Footer**: Version information

### Changing Tickers

To analyze a different stock:

1. Locate the ticker input field in the header
2. Enter a stock symbol (e.g., "TSLA", "NVDA", "GME")
3. Press Enter or click outside the field
4. All panels will refresh with new data for that ticker

---

## Signal Panels

Each signal panel displays:

- **Title**: The name of the signal
- **Signal Classification**: Buy/Sell/Neutral with strength indicator
- **Confidence Score**: How confident the signal is (0-100%)
- **Data Visualization**: Charts, gauges, tables, or text depending on the signal type
- **Timestamp**: When the analysis was performed

---

### 1. Whisper Number Tracker

**Purpose**: Detects unofficial earnings expectations and price targets circulating on social media before official announcements.

**What It Does**:

- Searches Twitter/X for mentions of the ticker with financial terms (earnings, estimates, targets, forecasts)
- Extracts numerical predictions from tweets:
  - **EPS (Earnings Per Share)**: e.g., "$1.50 EPS", "earnings of $2.25"
  - **Revenue**: e.g., "$500M revenue", "revenue of $2B"
  - **Price Targets**: e.g., "price target $150", "PT $200"
  - **Growth Rates**: e.g., "20% growth", "expects 25% increase"
- Aggregates predictions by confidence (based on author credibility and engagement)
- Compares "whisper numbers" to official estimates (if available)

**How It Works**:

1. Collects last 7 days of tweets mentioning the ticker with financial keywords
2. Uses regex patterns to extract numbers and their context
3. Weights predictions by:
   - Author follower count (verified accounts get bonus)
   - Tweet engagement (likes, retweets, replies)
   - Sentiment context (bullish, bearish, neutral)
4. Groups identical predictions and tracks mention frequency

**Visualization Type**: Text-based list

**Example Output**:

```
Whisper Numbers for AAPL:
- EPS: $1.85 (10 mentions, 75% confidence, bullish)
- Price Target: $195 (8 mentions, 68% confidence, bullish)
- Revenue: $95.2B (5 mentions, 62% confidence, neutral)
- Growth Rate: 15% (3 mentions, 45% confidence, bullish)

Signal: BUY (Moderate)
Confidence: 72%
Reasoning: Whisper numbers suggest higher than expected earnings
```

**Trading Implications**:

- **Bullish Signal**: Whisper numbers significantly higher than official estimates → Potential positive surprise
- **Bearish Signal**: Whisper numbers lower than official estimates → Potential disappointment
- **High Mention Count**: More reliable signal (crowd wisdom)
- **Verified Sources**: Higher quality predictions

**Best Used For**:

- Pre-earnings trade planning
- Identifying sentiment before official announcements
- Gauging market expectations vs. reality

---

### 2. Crowded Trade Exit Signal

**Purpose**: Identifies when popular trades are becoming too crowded, signaling potential reversals when retail sentiment reaches extreme levels.

**What It Does**:

- Monitors tweet volume and sentiment for a ticker
- Detects when "everyone is talking about" a stock
- Identifies contrarian opportunities when crowd sentiment is one-sided
- Tracks momentum shifts as retail traders pile in or exit

**How It Works**:

1. Measures tweet volume vs. historical baseline (7 days vs. 30 days)
2. Analyzes sentiment uniformity (are all tweets bullish/bearish?)
3. Tracks retail participation indicators:
   - First-time mentions by new traders
   - FOMO (Fear Of Missing Out) keywords
   - "To the moon" type language
4. Detects early exit signals:
   - Profit-taking mentions
   - "I'm out" declarations
   - Sentiment reversal

**Visualization Type**: Text summary with metrics

**Example Output**:

```
Crowded Trade Analysis for GME:
Tweet Volume: 1,247 (↑185% vs. baseline)
Sentiment Uniformity: 92% bullish
New Participants: 458 new accounts
FOMO Score: 87/100

Crowd Indicators:
- "to the moon" mentions: 142
- "this is it" mentions: 89
- Profit taking mentions: 12

Signal: SELL (Strong)
Confidence: 84%
Reasoning: Extreme crowding with 92% bullish sentiment and high FOMO - contrarian exit signal
```

**Trading Implications**:

- **Strong Sell**: Extreme crowding (>80% one-sided sentiment) → Reversal likely
- **Moderate Sell**: High crowding (60-80%) → Watch for exit opportunity
- **Neutral**: Balanced sentiment → No clear crowding
- **Moderate Buy**: Crowd exiting (volume decreasing, sentiment shifting) → Potential re-entry

**Best Used For**:

- Identifying tops in meme stocks or viral plays
- Timing exits on popular trades
- Contrarian entry points after crowd exits

**Warning Signs**:

- Tweet volume >150% above baseline + >85% sentiment uniformity = Peak crowding
- Sudden shift from bullish to bearish = Capitulation beginning

---

### 3. Small Cap Smart Money

**Purpose**: Tracks smart money (institutional investors, hedge funds, notable traders) activity in small-cap stocks where their moves can have significant impact.

**What It Does**:

- Identifies tweets from high-credibility accounts (verified, high follower count)
- Filters for small-cap focused discussions
- Detects accumulation or distribution signals
- Tracks "whale" activity mentions

**How It Works**:

1. Searches for ticker mentions from accounts with >50k followers or verified status
2. Analyzes tweet content for smart money indicators:
   - Accumulation keywords: "building position", "accumulating", "buying more"
   - Distribution keywords: "reducing", "taking profits", "trimming"
   - Insider activity mentions
   - Institutional filings references
3. Weights signals by author credibility
4. Filters out noise from retail traders

**Visualization Type**: Text-based list with smart money activity

**Example Output**:

```
Smart Money Activity for PLTR:
Tracked Accounts: 12 high-credibility accounts

Recent Activity:
1. @HedgeFundAnalyst (250k followers) - "Building PLTR position on this dip"
   → Bullish accumulation signal (Confidence: 82%)

2. @InstitutionalTrader (180k followers) - "PLTR looking interesting here"
   → Neutral research signal (Confidence: 65%)

3. @SmartMoneyAlert (120k followers) - "PLTR whale activity detected - 500k shares"
   → Bullish accumulation signal (Confidence: 78%)

Smart Money Sentiment: 75% Bullish

Signal: BUY (Moderate)
Confidence: 75%
Reasoning: Multiple high-credibility accounts showing accumulation interest
```

**Trading Implications**:

- **Strong Buy**: Multiple smart money accounts accumulating
- **Moderate Buy**: 1-2 credible accounts showing interest
- **Strong Sell**: Smart money distribution signals
- **Neutral**: No clear smart money activity

**Best Used For**:

- Small-cap stock research
- Following institutional flows
- Identifying early-stage accumulation
- Confirming your thesis with smart money validation

**Red Flags**:

- Smart money selling while retail buying = Distribution
- Sudden increase in smart money mentions after big move = Potential top

---

### 4. Fear Compression Scan

**Purpose**: Monitors sentiment shifts during fear events to identify when widespread panic is subsiding, creating potential buying opportunities (the "blood in the streets" signal).

**What It Does**:

- Tracks fear indicators in real-time
- Measures sentiment compression (fear declining after peak)
- Identifies stocks showing resilience during market panic
- Detects capitulation signals (maximum fear = potential bottom)

**How It Works**:

1. Analyzes tweets for fear keywords:
   - **Panic indicators**: crash, panic, dump, bloodbath, massacre, collapse
   - **Capitulation indicators**: giving up, selling everything, done with, bottom
   - **Recovery indicators**: holding up, resilient, buying the dip, oversold
2. Calculates fear metrics:
   - Current fear level (0-100)
   - Historical baseline
   - Fear trend (rising/stable/declining)
3. Measures compression score: How much fear is subsiding (0-100)
4. Calculates resilience: How well the stock holds price during fear

**Visualization Type**: Gauge showing fear level and compression

**Example Output**:

```
Fear Compression Analysis for AAPL:

Fear Metrics:
Current Fear Level: 72/100 (High)
Historical Baseline: 35/100
Fear Change: +105% (Fear Rising)
Trend: Declining ↓

Indicators:
Panic Keywords: 23 mentions
Capitulation Signals: 15 mentions  ← Bottoming indicator
Recovery Signals: 18 mentions     ← Compression beginning

Compression Score: 68/100 (Fear subsiding)
Resilience Score: 78% (Price holding well)

Signal: BUY (Strong)
Confidence: 81%
Reasoning: High fear with strong capitulation signals and good price resilience - compression opportunity
```

**Gauge Visualization**:

- **Green Zone (0-30)**: Low fear, normal conditions
- **Yellow Zone (30-60)**: Elevated fear, monitor
- **Orange Zone (60-80)**: High fear, look for compression
- **Red Zone (80-100)**: Extreme fear, prime compression opportunity

**Trading Implications**:

- **Strong Buy**: Compression score >70 + Resilience >60% = Fear peak passed
- **Moderate Buy**: Compression score >50 OR high resilience during fear
- **Neutral**: Fear stable without clear compression
- **Sell**: Fear rising rapidly without resilience

**Best Used For**:

- Market crash/correction buying opportunities
- Finding stocks that hold up during panic
- Timing entries during sentiment extremes
- Contrarian "blood in the streets" plays

**Key Patterns**:

- Capitulation signals > Panic signals = Potential bottom forming
- High fear + Price resilience = Strong buy signal
- Fear declining + Recovery signals increasing = Compression confirmed

---

### 5. Macro to Micro Translation

**Purpose**: Connects macro economic trends and narratives to specific stock opportunities, helping traders translate big-picture themes into actionable trades.

**What It Does**:

- Identifies dominant macro narratives (inflation, rates, recession, AI boom, etc.)
- Maps macro themes to specific stocks that benefit
- Tracks correlation between macro discussions and stock mentions
- Detects rotation opportunities

**How It Works**:

1. Searches for macro economic keywords:
   - Inflation, deflation, rates, Fed, recession, growth
   - Sector themes: AI, crypto, energy transition, supply chain
   - Geographic themes: China, emerging markets, Europe
2. Analyzes which tickers are mentioned alongside macro themes
3. Measures correlation strength
4. Identifies stocks positioned to benefit from macro trends

**Visualization Type**: Text-based narrative connection

**Example Output**:

```
Macro to Micro Translation for NVDA:

Dominant Macro Narratives (Last 7 Days):
1. AI Infrastructure Boom (287 mentions)
   → High correlation with NVDA (0.82)

2. Data Center Expansion (156 mentions)
   → Moderate correlation with NVDA (0.65)

3. Chip Shortage Recovery (94 mentions)
   → Moderate correlation with NVDA (0.58)

Narrative Connections:
- "AI boom fueling NVDA demand" (42 tweets)
- "Data center buildout benefiting NVDA" (31 tweets)
- "NVDA positioned for AI infrastructure" (28 tweets)

Macro-to-Stock Translation Score: 78/100

Signal: BUY (Strong)
Confidence: 76%
Reasoning: Strong correlation between AI infrastructure narrative and NVDA mentions - macro tailwind identified
```

**Trading Implications**:

- **Strong Buy**: High correlation (>0.7) with bullish macro narrative
- **Moderate Buy**: Moderate correlation (>0.5) with emerging theme
- **Sell**: Stock tied to bearish macro narrative
- **Neutral**: No clear macro connection

**Best Used For**:

- Identifying sector rotation opportunities
- Finding stocks riding macro waves
- Early positioning before themes go mainstream
- Connecting news headlines to specific plays

**Examples of Macro-to-Micro Plays**:

- Rising rates → Financials (JPM, BAC)
- AI boom → Semiconductor/Cloud (NVDA, MSFT)
- Energy transition → EV/Solar (TSLA, ENPH)
- Deglobalization → Domestic manufacturing (CAT, DE)

---

### 6. Management Credibility Signal

**Purpose**: Analyzes the tone, credibility, and consistency of company management communications (earnings calls, press releases, social media) to gauge trustworthiness and detect potential issues.

**What It Does**:

- Monitors management-related tweets and sentiment
- Detects credibility issues or praise
- Tracks consistency of messaging
- Identifies red flags (overpromising, deflection, scandals)

**How It Works**:

1. Searches for tweets mentioning:
   - CEO/management names
   - Earnings calls, guidance, forecasts
   - Corporate actions, announcements
2. Analyzes tone and credibility keywords:
   - **Positive**: transparent, credible, honest, delivers, trust
   - **Negative**: overpromised, misleading, shady, concerns, red flags
3. Tracks messaging consistency over time
4. Weights by author credibility (analysts, journalists, investors)

**Visualization Type**: Gauge showing credibility score

**Example Output**:

```
Management Credibility Analysis for TSLA:

Credibility Metrics:
Overall Credibility Score: 68/100
Sentiment Trend: Declining ↓

Recent Mentions:
Positive Credibility: 24 mentions
- "Elon delivering on production targets" (12 mentions)
- "Transparent earnings call" (8 mentions)

Negative Credibility: 36 mentions
- "Overpromising on FSD timeline again" (18 mentions)
- "Guidance concerns" (11 mentions)

Red Flags Detected: 3
- Repeated FSD timeline delays
- Production forecast vs. reality gap
- Pricing strategy inconsistency

Signal: NEUTRAL (Weak)
Confidence: 58%
Reasoning: Mixed credibility signals - some delivery but ongoing overpromising concerns
```

**Gauge Visualization**:

- **Green Zone (70-100)**: High credibility - Management trusted
- **Yellow Zone (50-70)**: Mixed credibility - Monitor closely
- **Orange Zone (30-50)**: Low credibility - Caution advised
- **Red Zone (0-30)**: Credibility crisis - Major concerns

**Trading Implications**:

- **Buy**: High credibility (>70) + Improving trend → Management premium
- **Hold**: Mixed credibility (50-70) → Wait for clarity
- **Sell**: Low credibility (<50) → Management discount, risk premium
- **Strong Sell**: Credibility crisis + Red flags → Exit position

**Best Used For**:

- Pre-earnings risk assessment
- Long-term investment decisions
- Detecting warning signs before problems surface
- Valuing management quality in stock price

**Red Flags to Watch**:

- Repeated guidance misses
- Overpromising on timelines
- Deflection during questioning
- Inconsistent messaging
- Related-party transactions

**Green Flags**:

- Consistent delivery on promises
- Transparent communication
- Conservative guidance, beats expectations
- Strong analyst trust

---

### 7. Early Meme Formation Detector

**Purpose**: Identifies emerging viral stock narratives in their early stages, before they go mainstream and attract massive retail attention.

**What It Does**:

- Detects unusual language patterns and meme-like content
- Tracks viral spread of stock mentions
- Identifies "pre-viral" stocks gaining momentum
- Measures narrative cohesion (is everyone using similar language?)

**How It Works**:

1. Searches for meme-like patterns:
   - Repetitive phrases ("this is the way", "apes together strong")
   - Emojis and symbols (🚀, 💎, 🙌)
   - Community language formation
   - Hashtag creation and adoption
2. Measures viral metrics:
   - Tweet velocity (mentions per hour)
   - Retweet amplification
   - Cross-platform spread
   - Influencer pickup
3. Tracks narrative cohesion:
   - Are multiple people using same phrases?
   - Is a story forming around the stock?
4. Identifies stage: Early/Emerging/Viral/Peaked

**Visualization Type**: Text-based meme narrative summary

**Example Output**:

```
Early Meme Formation Detection for GME:

Meme Stage: Emerging (Early momentum)
Viral Score: 45/100
Narrative Cohesion: 72%

Emerging Patterns:
1. "GME to the moon" (89 mentions, ↑250% velocity)
   Emoji usage: 🚀 (67), 💎 (43), 🙌 (38)

2. "Diamond hands" narrative (56 tweets, ↑180% velocity)
   Hashtags: #DiamondHands, #GMEArmy

3. Community formation: r/wallstreetbets crossover (34 mentions)

Viral Metrics:
- Tweet Velocity: 12.3 tweets/hour (↑340% vs. baseline)
- Retweet Ratio: 3.2x (High amplification)
- Influencer Pickup: 3 accounts >100k followers
- New Participants: 127 first-time GME tweeters

Narrative Strength: 68/100

Signal: BUY (Moderate)
Confidence: 64%
Reasoning: Early meme formation detected - viral patterns emerging but not yet mainstream
```

**Trading Implications**:

- **Strong Buy**: Early stage (viral score 40-60) + High narrative cohesion → Get in early
- **Moderate Buy**: Emerging stage (viral score 60-75) → Momentum building
- **Sell**: Peaked stage (viral score >90) → Exit, mainstream saturation
- **Avoid**: Declining stage → Meme over, bag holders forming

**Best Used For**:

- Early entry on meme stocks before explosion
- Timing exits before meme peaks
- Understanding retail sentiment waves
- Risk management on viral plays

**Meme Lifecycle Stages**:

1. **Dormant** (Viral Score 0-20): No meme activity
2. **Early** (Viral Score 20-40): Patterns emerging, insiders accumulating
3. **Emerging** (Viral Score 40-60): Momentum building, early mainstream pickup ← **BEST ENTRY**
4. **Viral** (Viral Score 60-80): Explosive growth, FOMO kicking in
5. **Peaked** (Viral Score 80-100): Saturation, everyone knows ← **EXIT ZONE**
6. **Declining** (Viral Score dropping): Bag holder formation, avoid

**Warning**: Meme stocks are highly volatile and risky. Use tight stops and position sizing.

---

### 8. Regulatory Tailwind Radar

**Purpose**: Detects regulatory changes, policy shifts, and legal developments that could create tailwinds or headwinds for specific stocks or sectors.

**What It Does**:

- Monitors tweets about regulatory news
- Identifies policy changes affecting industries
- Tracks FDA approvals, legal rulings, government contracts
- Detects lobbying activity and political shifts

**How It Works**:

1. Searches for regulatory keywords:
   - FDA, approval, regulation, policy, government
   - Legal, ruling, court, lawsuit, settlement
   - Tax, subsidy, tariff, sanction
2. Filters tweets mentioning ticker + regulatory terms
3. Classifies impact:
   - **Tailwind**: Positive regulatory change
   - **Headwind**: Negative regulatory change
   - **Uncertain**: Pending decision
4. Measures magnitude and probability

**Visualization Type**: List of regulatory events

**Example Output**:

```
Regulatory Tailwind Analysis for PFE:

Detected Events (Last 7 Days):

1. FDA Approval Signal (High Impact)
   - "PFE new drug awaiting FDA approval this month" (23 mentions)
   - Expected Decision: Feb 15, 2026
   - Probability: 70%
   - Impact: Bullish Tailwind (+15-20% potential)

2. Healthcare Policy Discussion (Medium Impact)
   - "Medicare negotiation changes could benefit PFE" (14 mentions)
   - Timeline: Q2 2026
   - Probability: 45%
   - Impact: Moderate Tailwind (+5-10% potential)

3. Patent Extension Filed (Low Impact)
   - "PFE seeking patent extension on key drug" (8 mentions)
   - Timeline: TBD
   - Probability: 30%
   - Impact: Minor Tailwind (+2-5% potential)

Regulatory Tailwind Score: 72/100

Signal: BUY (Strong)
Confidence: 68%
Reasoning: Major FDA approval catalyst pending with high probability - significant regulatory tailwind
```

**Trading Implications**:

- **Strong Buy**: Major tailwind (FDA approval, favorable ruling) + High probability
- **Moderate Buy**: Moderate tailwind + Decent probability
- **Hold**: Uncertain outcome, wait for clarity
- **Sell**: Regulatory headwind detected
- **Strong Sell**: Major headwind (lawsuit, ban, fine)

**Best Used For**:

- Biotech/pharma FDA catalysts
- Clean energy policy plays
- Financial regulation changes
- Legal ruling impacts
- Government contract awards

**Common Regulatory Catalysts**:

**Biotech/Pharma**:

- FDA approvals (PDUFA dates)
- Clinical trial results
- Patent expirations
- Drug pricing policies

**Tech**:

- Antitrust rulings
- Privacy regulations
- Section 230 changes
- AI regulation

**Energy**:

- Climate policy
- Subsidies/tax credits
- Drilling permits
- Carbon taxes

**Finance**:

- Banking regulations
- Crypto policy
- Interest rate policy
- Capital requirements

---

### 9. Global Edge Finder

**Purpose**: Discovers geographic arbitrage opportunities by identifying stocks mentioned more frequently in certain regions, time zones, or languages, revealing information asymmetries.

**What It Does**:

- Analyzes tweet geography and language
- Identifies stocks trending in specific regions before global awareness
- Detects information flows from local markets to global markets
- Tracks ADR/local listing discrepancies

**How It Works**:

1. Analyzes tweet metadata:
   - User location
   - Tweet language
   - Posting time (timezone analysis)
   - Regional trending patterns
2. Compares regional mention volume:
   - Is stock trending in Asia but not US?
   - Is European discussion ahead of US market open?
3. Identifies information edges:
   - Local news breaking first
   - Regional analyst coverage
   - Supply chain insights from manufacturing regions

**Visualization Type**: Table showing geographic distribution

**Example Output**:

```
Global Edge Analysis for NIO:

Geographic Distribution:

Region          | Mentions | % of Total | Volume Change | Lead Time
----------------|----------|------------|---------------|----------
China/Asia      | 342      | 58%        | ↑245%         | +8 hours
Europe          | 156      | 26%        | ↑120%         | +3 hours
United States   | 94       | 16%        | ↑45%          | Baseline

Language Breakdown:
- Chinese: 285 mentions (↑280% vs baseline)
- English: 187 mentions (↑95% vs baseline)
- German: 34 mentions (↑140% vs baseline)

Information Edge Detected:
- China discussion spiked 8 hours before US market open
- Topic: New battery technology announcement
- European coverage picked up 3 hours later
- US awareness lag: 5-8 hours

Geographic Edge Score: 84/100

Signal: BUY (Strong)
Confidence: 73%
Reasoning: Strong information edge - positive news trending in China/Asia 8 hours before US awareness
```

**Trading Implications**:

- **Strong Buy**: Positive news trending in home market before US awareness
- **Moderate Buy**: Positive regional discussion with time lag
- **Sell**: Negative news in home market before US catches up
- **Neutral**: No clear geographic edge

**Best Used For**:

- ADR trading (Chinese stocks, European stocks)
- Time zone arbitrage
- Earning information from home markets
- Regional news before global awareness

**Common Geographic Edges**:

**Chinese ADRs (NIO, BABA, JD)**:

- Chinese social media (Weibo, WeChat) discussion before US
- Regulatory news breaks in China first
- Sales data from local analysts
- Trade between Asia close and US open

**European Stocks (SAP, ASML)**:

- European news before US market open
- ECB policy impacts
- Regional supply chain information
- Trade between Europe close and US open

**Japanese Stocks (SONY, TSM)**:

- Tokyo trading insights
- Yen currency impacts
- Asian supply chain news
- Overnight session information

**How to Trade Geographic Edges**:

1. Monitor overnight stock movements in home region
2. Check regional social media and news
3. Trade at US market open based on regional information
4. Use pre-market hours for positioning

---

### 10. Future Price Path Simulation

**Purpose**: Generates three potential future price paths (bullish, base, bearish) using historical volatility, trend analysis, and sentiment data to visualize possible outcomes.

**What It Does**:

- Calculates historical price volatility and drift
- Analyzes current sentiment bias
- Generates three scenario paths with probabilities
- Provides confidence intervals for each path
- Shows expected returns for each scenario

**How It Works**:

1. Fetches historical price data (60 days default)
2. Calculates metrics:
   - Historical volatility (annualized)
   - Price drift (average daily return)
   - Daily returns distribution
3. Analyzes recent sentiment from tweets:
   - Bullish keywords: moon, pump, breakout, rally, surge
   - Bearish keywords: crash, dump, short, decline, correction
   - Calculates sentiment bias (-1 to +1)
4. Generates three paths using Geometric Brownian Motion:
   - **Bullish Path**: Higher drift, lower volatility
   - **Base Path**: Historical drift and volatility
   - **Bearish Path**: Lower drift, higher volatility
5. Adjusts paths based on sentiment bias
6. Calculates probability for each scenario

**Visualization Type**: Interactive chart with three price paths

**Example Output**:

```
Future Price Path Simulation for AAPL:

Current Price: $185.50

Simulation Parameters:
- Historical Volatility: 28.5% (annualized)
- Historical Drift: 12.3% (annualized)
- Sentiment Bias: +0.42 (Moderately Bullish)
- Forecast Period: 30 days
- Confidence Level: 95%

Price Paths (30 Days Forward):

1. BULLISH PATH (Probability: 45%)
   - Target Price: $205.30
   - Expected Return: +10.7%
   - Volatility: 25.7%
   - Confidence: 72%
   - Price Range: $195 - $215 (95% CI)

2. BASE CASE (Probability: 35%)
   - Target Price: $192.80
   - Expected Return: +3.9%
   - Volatility: 28.5%
   - Confidence: 60%
   - Price Range: $180 - $205 (95% CI)

3. BEARISH PATH (Probability: 20%)
   - Target Price: $172.60
   - Expected Return: -7.0%
   - Volatility: 31.4%
   - Confidence: 48%
   - Price Range: $160 - $185 (95% CI)

Most Likely Outcome: Bullish Path
Risk/Reward Ratio: 1:1.5 (Favorable)

Signal: BUY (Moderate)
Confidence: 68%
Reasoning: Positive sentiment bias supports higher probability bullish path with favorable risk/reward
```

**Chart Visualization**:

- X-axis: Time (0 to 30 days forward)
- Y-axis: Stock price
- Three colored lines:
  - **Green line**: Bullish path
  - **Blue line**: Base case path
  - **Red line**: Bearish path
- Shaded confidence intervals around each path

**Trading Implications**:

**Bullish Setup** (Bullish path >40% probability):

- Entry: Current price
- Target: Bullish path target price
- Stop: Below base case lower confidence bound
- Position sizing: Based on probability and risk/reward

**Bearish Setup** (Bearish path >40% probability):

- Consider avoiding or reducing position
- Set tighter stops
- Look for better entry after decline
- Consider hedging

**Neutral Setup** (All paths ~33% probability):

- Range-bound expectation
- Sell options premium strategies
- Wait for clearer directional signal

**Best Used For**:

- Setting realistic price targets
- Understanding potential outcomes distribution
- Risk management and position sizing
- Identifying asymmetric risk/reward setups
- Complementing other signal panels

**How Sentiment Affects Paths**:

- **Positive Sentiment Bias** (+0.3 to +1.0):
  - Increases bullish path probability
  - Adds positive drift to all scenarios
  - Tightens confidence intervals on upside

- **Negative Sentiment Bias** (-0.3 to -1.0):
  - Increases bearish path probability
  - Adds negative drift to all scenarios
  - Widens confidence intervals on downside

- **Neutral Sentiment** (-0.3 to +0.3):
  - Equal probability across all paths
  - Historical metrics drive outcomes
  - Wider confidence intervals

**Advanced Interpretation**:

**High Volatility Environment** (>35%):

- Wider price ranges
- Less confident predictions
- Higher risk, higher potential reward
- Consider options strategies

**Low Volatility Environment** (<20%):

- Tighter price ranges
- More confident predictions
- Lower risk, lower potential reward
- Good for directional trades

**Diverging Paths**:

- Large gap between bullish and bearish = High uncertainty
- Narrow gap = More consensus on direction

**Probability Insights**:

- One path >50% probability = Strong directional bias
- All paths ~33% = High uncertainty, range-bound
- Two paths combined >70% = Likely direction with variation

---

## Interpreting Signal Classifications

All signal panels provide a standardized classification system:

### Signal Direction

- **STRONG BUY**: High confidence bullish signal (>75% confidence)
- **BUY**: Moderate confidence bullish signal (60-75% confidence)
- **NEUTRAL**: No clear directional edge (<60% confidence or mixed signals)
- **SELL**: Moderate confidence bearish signal (60-75% confidence)
- **STRONG SELL**: High confidence bearish signal (>75% confidence)

### Confidence Score

The confidence score (0-100%) represents how confident the signal is based on:

- Data quality and quantity
- Signal strength and consistency
- Historical accuracy of similar patterns
- Agreement across multiple indicators

**Confidence Interpretation**:

- **90-100%**: Very High - Strong conviction
- **75-89%**: High - Good conviction
- **60-74%**: Moderate - Reasonable conviction
- **40-59%**: Low - Weak conviction
- **0-39%**: Very Low - Unreliable signal

### Signal Reasoning

Each panel provides a text explanation of why the signal was generated, helping you:

- Understand the logic behind the classification
- Identify which factors drove the signal
- Validate the signal against your own analysis
- Learn pattern recognition over time

---

## Using the Dashboard Effectively

### 1. Multi-Signal Confirmation

**Best Practice**: Don't trade on a single signal. Look for confluence across multiple panels.

**Example - Strong Buy Setup**:

```
✓ Whisper Number Tracker: BUY (72%) - Bullish whisper numbers
✓ Fear Compression: BUY (81%) - Fear subsiding
✓ Smart Money: BUY (75%) - Accumulation detected
✓ Future Price Path: BUY (68%) - Bullish path most likely
= Strong confluence, high confidence trade
```

**Example - Conflicting Signals (CAUTION)**:

```
✓ Whisper Number Tracker: BUY (70%)
✗ Crowded Trade Exit: SELL (84%) - Too crowded
✗ Management Credibility: NEUTRAL (58%) - Mixed signals
= Conflicting signals, reduce position size or wait
```

### 2. Signal Workflow by Trading Style

**Day Trading**:

1. Check **Global Edge Finder** for overnight developments
2. Review **Meme Formation Detector** for viral momentum
3. Monitor **Crowded Trade Exit** for extreme sentiment
4. Use **Future Price Path** for intraday targets

**Swing Trading (1-2 weeks)**:

1. Start with **Whisper Number Tracker** for upcoming catalysts
2. Check **Fear Compression** for entry timing
3. Validate with **Smart Money** activity
4. Set targets using **Future Price Path**

**Position Trading (1-3 months)**:

1. Identify themes with **Macro to Micro Translation**
2. Check **Regulatory Tailwind Radar** for catalysts
3. Validate **Management Credibility**
4. Monitor **Global Edge** for information flow
5. Use **Future Price Path** for long-term targets

**Pre-Earnings Play**:

1. **Whisper Number Tracker** - What's the street expecting?
2. **Management Credibility** - Can they deliver?
3. **Fear Compression** - Is fear priced in?
4. **Future Price Path** - What's the risk/reward?

### 3. Risk Management Integration

**Position Sizing Based on Confidence**:

- 90%+ confidence: Up to normal position size
- 75-89% confidence: 75% of normal position size
- 60-74% confidence: 50% of normal position size
- Below 60%: Pass or minimal position

**Stop Loss Placement**:

- Use **Future Price Path** lower confidence bounds
- Invalidation point: Below bearish path mean
- Mental stop: Signal flips from BUY to SELL

**Profit Targets**:

- Conservative: Base case path target
- Aggressive: Bullish path target
- Scale out: 50% at base case, 50% at bullish path

### 4. Time Horizon Matching

Different signals work better for different timeframes:

**Immediate (0-3 days)**:

- Global Edge Finder
- Crowded Trade Exit
- Fear Compression (during volatile periods)

**Short-term (3-14 days)**:

- Whisper Number Tracker (pre-earnings)
- Meme Formation Detector
- Smart Money activity

**Medium-term (2-8 weeks)**:

- Regulatory Tailwind Radar
- Macro to Micro Translation
- Future Price Path (30-day simulation)

**Long-term (2+ months)**:

- Management Credibility
- Macro to Micro (structural themes)
- Regulatory Tailwind (policy changes)

---

## Advanced Usage

### 1. Creating Signal Combinations

**The "Perfect Storm" Buy Setup**:

```
Required Conditions (All Must Be True):
1. Fear Compression Score > 70 (Fear subsiding)
2. Smart Money accumulation detected
3. Whisper Numbers bullish (if near earnings)
4. Future Price Path: Bullish scenario >45% probability
5. NOT crowded (Crowded Trade Exit < 60)

Result: Extremely high probability setup
Confidence: 85%+ combined
Position Size: Maximum allowed
```

**The "Meme Play" Entry**:

```
Required Conditions:
1. Meme Formation: Early stage (Viral Score 40-60)
2. Crowded Trade: Not yet extreme (<70)
3. Smart Money: Starting to notice (1-2 mentions)
4. Future Price Path: High volatility + Bullish bias

Result: Early meme momentum play
Confidence: 60-70%
Position Size: Moderate, tight stops
Exit: When viral score >85 (peaked)
```

**The "Regulatory Catalyst" Play**:

```
Required Conditions:
1. Regulatory Tailwind: High-impact event (FDA, ruling)
2. Management Credibility: High (>70) - Can execute
3. Fear Compression: Low fear OR fear subsiding
4. Future Price Path: Bullish scenario high probability

Result: Low-risk catalyst play
Confidence: 75%+
Position Size: Large, defined risk (event binary)
```

### 2. Custom Watchlists

**Build themed watchlists using signals**:

**Fear Compression Watchlist**:

- Filter for stocks with Compression Score > 65
- Sort by Resilience Score (highest first)
- Monitor daily for entry timing

**Smart Money Watchlist**:

- Filter for stocks with smart money activity
- Track accumulation vs. distribution
- Alert when new smart money enters

**Regulatory Catalyst Calendar**:

- Extract pending events from Regulatory Tailwind
- Add to calendar with probability scores
- Set alerts 1 week before decision dates

### 3. Backtesting Signal Performance

Track your signal success rate:

```
Signal Performance Log:

Whisper Number Tracker:
- Trades taken: 15
- Winners: 11 (73%)
- Average gain: +8.2%
- Average loss: -3.1%
- Best confidence range: 70-80%

Fear Compression:
- Trades taken: 8
- Winners: 7 (87%)
- Average gain: +12.5%
- Average loss: -4.2%
- Best setup: Compression >70 + Resilience >70
```

### 4. Real-time Monitoring Setup

**Alert Triggers**:

```javascript
// Pseudo-code for alert logic

if (fearCompressionScore > 70 && resilience > 0.6) {
  alert("High-probability fear compression setup on " + ticker);
}

if (memeViralScore > 40 && memeViralScore < 60) {
  alert("Early meme formation on " + ticker);
}

if (regulatoryTailwindScore > 75 && probability > 0.6) {
  alert("Major regulatory catalyst detected for " + ticker);
}

if (smartMoneyBullishCount > 3) {
  alert("Multiple smart money accumulation signals on " + ticker);
}
```

### 5. Portfolio-Level Dashboard

**Aggregate view across all holdings**:

```
Portfolio Signal Summary:

Holdings with BUY signals: 7/10 (70%)
Holdings with SELL signals: 1/10 (10%)
Average confidence: 68%

Top Risk: XYZ (Crowded Trade SELL 84%)
Top Opportunity: ABC (Fear Compression BUY 81%)

Upcoming Catalysts:
- Feb 15: PFE FDA decision (72% probability)
- Feb 20: AAPL earnings (Whisper: Bullish)
```

### 6. Integration with Other Tools

**Combine with Technical Analysis**:

- Use signals for direction
- Use technicals for entry/exit timing
- Example: Signal says BUY, wait for technical breakout

**Combine with Fundamental Analysis**:

- Signals identify candidates
- Fundamentals validate quality
- Example: Smart Money interest → Research fundamentals

**Combine with Options Strategies**:

- High confidence signals: Directional options
- Low confidence: Neutral strategies (iron condor)
- Binary catalysts: Straddles/strangles

---

## Troubleshooting & Tips

### Common Issues

**1. All Panels Showing Low Confidence**

- Likely low tweet volume for that ticker
- Try a more popular/liquid stock
- In real mode: May indicate genuine low signal

**2. Conflicting Signals Across Panels**

- Normal! Different timeframes and methodologies
- Look for confluence in 3+ panels
- When in doubt, sit out

**3. Mock vs. Real Data Differences**

- Mock data is idealized for demonstration
- Real data can be noisy and contradictory
- Real mode requires more interpretation

### Pro Tips

**Tip 1: Signal Strength Over Direction**

- A weak BUY is less useful than a strong NEUTRAL
- Confidence matters more than classification

**Tip 2: Context Matters**

- Signals work best in their intended context
- Don't use Meme Detector on blue-chip stocks
- Don't use Regulatory Tailwind on crypto

**Tip 3: Watch for Signal Changes**

- A signal flipping from BUY to SELL is important
- Track signal history over time
- Trend changes often precede price changes

**Tip 4: Use Demo Mode for Learning**

- Practice interpreting signals in mock mode
- Build pattern recognition skills
- Test strategies before using real money

**Tip 5: Customize for Your Style**

- Focus on 2-3 panels that match your approach
- Ignore signals that don't fit your timeframe
- Build your own signal combinations

---

## Conclusion

The DEX Liquidity Tracker provides 10 unique lenses to analyze market sentiment, each offering different insights:

1. **Whisper Number Tracker** - Unofficial expectations
2. **Crowded Trade Exit** - Sentiment extremes
3. **Small Cap Smart Money** - Institutional flows
4. **Fear Compression** - Panic subsiding
5. **Macro to Micro** - Theme translation
6. **Management Credibility** - Leadership trust
7. **Meme Formation** - Viral narratives
8. **Regulatory Tailwind** - Policy catalysts
9. **Global Edge** - Geographic arbitrage
10. **Future Price Path** - Scenario modeling

**Key Takeaways**:

- No single signal is perfect - use confluence
- Higher confidence = more reliable signals
- Match signals to your trading timeframe
- Practice interpretation in demo mode first
- Track your signal success rate over time

**Getting Started**:

1. Start with mock mode to learn the dashboard
2. Focus on 2-3 signals that match your style
3. Paper trade signal combinations
4. Add real data when comfortable
5. Build your personal playbook over time

For questions, issues, or feedback, see [README.md](README.md) for support information.

---

**Version**: 0.1.0
**Last Updated**: 2026-02-11
**Dashboard URL**: http://localhost:5173 (when running `npm run dev`)
