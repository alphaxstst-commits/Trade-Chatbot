// knowledge/JS businessScript.js

module.exports = {
  // Business hours (24‑hour format)
  businessHours: {
    open: 8,   // 8 AM
    close: 20, // 8 PM
    timezone: 'America/Toronto'
  },

  // Service catalogue with typical price ranges (non‑binding estimates)
  services: [
    {
      id: 'plumbing',
      name: 'Plumbing Repair',
      description: 'Fix leaks, pipes, faucets, toilets, water heaters.',
      typicalPriceRange: '$150 – $600',
      emergencyEligible: true
    },
    {
      id: 'hvac',
      name: 'HVAC Repair / Installation',
      description: 'Heating, cooling, ventilation, furnace, AC, heat pumps.',
      typicalPriceRange: '$200 – $1,200',
      emergencyEligible: true
    },
    {
      id: 'excavation',
      name: 'Excavation & Trenching',
      description: 'Digging, land grading, foundation work, utility lines.',
      typicalPriceRange: '$800 – $5,000',
      emergencyEligible: false
    },
    {
      id: 'electrical',
      name: 'Electrical Services',
      description: 'Wiring, panels, lighting, troubleshooting, generators.',
      typicalPriceRange: '$120 – $800',
      emergencyEligible: true
    },
    {
      id: 'general',
      name: 'General Handyman',
      description: 'Small repairs, installations, assembly, drywall, painting.',
      typicalPriceRange: '$80 – $400',
      emergencyEligible: false
    }
  ],

  // Keywords that trigger emergency path
  emergencyKeywords: [
    'burst pipe', 'flood', 'no heat', 'freezing', 'gas smell',
    'emergency', 'urgent', 'right away', 'immediate', 'fire',
    'broken pipe', 'water everywhere', 'danger'
  ],

  // Helper to find a service by name (fuzzy match)
  findService(query) {
    const lower = query.toLowerCase();
    return this.services.find(s => 
      s.name.toLowerCase().includes(lower) || 
      s.description.toLowerCase().includes(lower)
    );
  },

  // Helper to check if a message is emergency
  isEmergency(message) {
    const lower = message.toLowerCase();
    return this.emergencyKeywords.some(keyword => lower.includes(keyword));
  }
};