# AgentGate Threat Model

## Goals

AgentGate addresses the following threats:

1. **Unauthorized scraping**: Automated extraction of content without permission
2. **AI training data collection**: Crawlers building training datasets
3. **Price monitoring**: Competitors tracking pricing in real-time
4. **Content aggregation**: Third parties republishing content
5. **Resource exhaustion**: High-volume crawling affecting site performance

## Non-Goals

AgentGate does NOT address:

1. **DDoS attacks**: Use CDN/WAF for volumetric attacks
2. **Credential stuffing**: Use authentication security measures
3. **API abuse**: Use API rate limiting and authentication
4. **Human-assisted scraping**: Manual copy-paste by humans
5. **Perfect bot detection**: 100% accuracy is impossible

## Assumptions

1. Attackers use automated tools (bots, scripts, AI agents)
2. Bots have identifiable signals (headers, behavior patterns)
3. Site owners can declare acceptable use policies
4. Some false positives/negatives are acceptable
5. Defense in depth is preferable to single-point solutions

## Attack Vectors

### 1. User-Agent Spoofing

**Threat**: Bot pretends to be Googlebot or other approved agent

**Mitigation**:
- Multi-signal scoring (not just UA)
- Verify bot behavior matches claimed identity
- Check for missing bot-specific headers
- Rate limiting even for approved agents

**Residual Risk**: Medium - sophisticated spoofing can bypass UA checks

### 2. Header Manipulation

**Threat**: Bot adds human-like headers (Accept-Language, cookies)

**Mitigation**:
- Check header consistency
- Require JavaScript execution cookie
- Behavioral analysis (timing, navigation patterns)
- Honeypot detection

**Residual Risk**: Low-Medium - adds cost to attacker

### 3. Residential Proxy Networks

**Threat**: Bot uses residential IPs to avoid datacenter detection

**Mitigation**:
- Rate limiting per IP
- Behavioral analysis
- Honeypot traps
- Session tracking

**Residual Risk**: Medium - expensive for attacker but effective

### 4. JavaScript Execution

**Threat**: Bot uses headless browser (Puppeteer, Playwright)

**Mitigation**:
- Advanced fingerprinting (future)
- Behavioral challenges
- Rate limiting
- Honeypot links

**Residual Risk**: Medium - arms race, but adds significant cost

### 5. Slow/Low-Volume Crawling

**Threat**: Bot crawls slowly to avoid rate limits

**Mitigation**:
- Long-term session tracking
- Cumulative scoring
- Honeypot traps
- Policy enforcement on paths

**Residual Risk**: Low - slow crawling is expensive and detectable over time

### 6. Honeypot Detection

**Threat**: Bot identifies and avoids honeypot links

**Mitigation**:
- Dynamic honeypot URLs
- Invisible to humans (CSS, ARIA)
- Rotating tokens
- Multiple honeypot types

**Residual Risk**: Low-Medium - sophisticated bots may detect

## Defense Layers

```
Layer 1: Detection
├── User-Agent analysis
├── Header validation
├── IP/ASN checking
└── Rate limiting

Layer 2: Policy Enforcement
├── Path-based rules
├── Agent-based rules
├── Mode (log/enforce)
└── Graduated responses

Layer 3: Honeypots
├── Static traps
├── Dynamic tokens
├── Invisible links
└── Canary content

Layer 4: Observability
├── JSONL logging
├── Dashboard analytics
├── Alert triggers
└── Evidence collection
```

## False Positives

### Legitimate Bots That May Be Flagged

- Search engine crawlers (mitigation: approve in policy)
- Accessibility tools
- Security scanners
- RSS readers
- Monitoring services

### Mitigation Strategies

1. Start in `log_only` mode
2. Review logs before enforcing
3. Maintain approved_agents list
4. Provide appeal/contact mechanism
5. Offer API access for legitimate use

## False Negatives

### Bots That May Slip Through

- Sophisticated headless browsers
- Residential proxy networks
- Human-assisted automation
- Novel AI agents not in known list

### Acceptable Risk

AgentGate is designed for **defense in depth**, not perfect detection. It raises the cost of scraping and provides observability, but cannot guarantee 100% block rate.

## Ethical Considerations

1. **Transparency**: Expose policy via `/agent-policy.json`
2. **Proportionality**: Graduated responses, not immediate blocking
3. **Appeal process**: Provide contact for legitimate agents
4. **No active attacks**: Defensive only, no countermeasures that damage
5. **SEO-friendly**: Approve major search engines

## Compliance

- **GDPR**: Log IP addresses (consider anonymization for production)
- **robots.txt**: Complementary, not replacement
- **CFAA**: Defensive measures are legal; avoid active counterattacks
- **Terms of Service**: Align with your site's ToS

## Recommendations

1. **Start in log_only mode** for 1-2 weeks
2. **Review dashboard** to understand traffic patterns
3. **Tune weights** based on your specific threats
4. **Approve known good agents** (Googlebot, Bingbot)
5. **Provide API access** for legitimate automation
6. **Document policy** publicly via `/llms.txt`
7. **Monitor honeypot hits** as high-confidence bot signals
