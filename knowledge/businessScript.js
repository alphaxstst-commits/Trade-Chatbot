// knowledge/JS businessScript.js

module.exports = {
  // Business hours
  businessHours: {
    open: 8,
    close: 20,
    timezone: 'America/Toronto'
  },

  // Services with price ranges
  services: [
    {
      id: 'plumbing',
      name: 'Plumbing',
      description: 'Fix leaks, pipes, faucets, toilets, water heaters, bathtub installation.',
      typicalPriceRange: '$150 – $600',
      emergencyEligible: true
    },
    {
      id: 'hvac',
      name: 'HVAC',
      description: 'Heating, cooling, ventilation, furnace, AC, heat pumps.',
      typicalPriceRange: '$200 – $1,200',
      emergencyEligible: true
    },
    {
      id: 'excavation',
      name: 'Excavation',
      description: 'Digging, land grading, foundation work, utility lines.',
      typicalPriceRange: '$800 – $5,000',
      emergencyEligible: false
    },
    {
      id: 'electrical',
      name: 'Electrical',
      description: 'Wiring, panels, lighting, troubleshooting, generators.',
      typicalPriceRange: '$120 – $800',
      emergencyEligible: true
    },
    {
      id: 'handyman',
      name: 'Handyman',
      description: 'Small repairs, installations, assembly, drywall, painting, mulching, land clearing.',
      typicalPriceRange: '$80 – $400',
      emergencyEligible: false
    }
  ],

  // Emergency keywords
  emergencyKeywords: [
    'burst pipe', 'flood', 'no heat', 'freezing', 'gas smell',
    'emergency', 'urgent', 'right away', 'immediate', 'fire',
    'broken pipe', 'water everywhere', 'danger', 'asap', 'now',
    'leaking', 'flooding', 'emergency plumber', '24/7'
  ],

  // Greeting message with 3 options
  getGreeting() {
    return `Hi there! 👋 I'm TradePro AI. How can I help you today?

**Choose an option:**

1️⃣ **Book a service** (repair, install, or get a quote)
2️⃣ **Ask a question** (pricing, availability, what we do)
3️⃣ **Emergency help** (urgent issues like burst pipes)

Or just tell me what you need in your own words!`;
  },

  // Check if message is emergency
  isEmergency(message) {
    const lower = message.toLowerCase();
    return this.emergencyKeywords.some(keyword => lower.includes(keyword));
  },

  // Find service by name (fuzzy match)
  findService(query) {
    const lower = query.toLowerCase();
    // Check if any service name or description matches
    for (const service of this.services) {
      if (service.name.toLowerCase().includes(lower) ||
          service.description.toLowerCase().includes(lower) ||
          lower.includes(service.name.toLowerCase())) {
        return service;
      }
    }
    return null;
  }
};