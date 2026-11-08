import type { CrmSnapshot } from "@/lib/crm-data"

export const demoCrmData: CrmSnapshot = {
  viewer: { id: "demo", name: "Maya Chen", email: "maya@northstar.studio" },
  preferences: {
    notifications: { replies: true, assignments: true, dailyDigest: false },
    channels: { whatsapp: true, email: true, instagram: true, facebook: true, webchat: true },
  },
  contacts: [
    { id: "c1", name: "Olivia Rhye", initials: "OR", color: "bg-violet-100 text-violet-700", company: "Layers Studio", email: "olivia@layers.studio", phone: "+1 (415) 555-0132", channel: "whatsapp", handle: "+1 415 555 0132", assigned: "Maya Chen", lastSeen: "Online now", tags: ["VIP", "Enterprise"] },
    { id: "c2", name: "Phoenix Baker", initials: "PB", color: "bg-amber-100 text-amber-700", company: "Baker & Co.", email: "phoenix@bakerco.com", phone: "+1 (646) 555-0198", channel: "email", handle: "phoenix.baker", assigned: "Alex Morgan", lastSeen: "Active 12m ago", tags: ["New customer"] },
    { id: "c3", name: "Lana Steiner", initials: "LS", color: "bg-pink-100 text-pink-700", company: "Cloudline", email: "lana@cloudline.io", phone: "+1 (212) 555-0171", channel: "instagram", handle: "@lanasteiner", assigned: "Jordan Lee", lastSeen: "Active 1h ago", tags: ["Social", "Product feedback"] },
    { id: "c4", name: "Demi Wilkinson", initials: "DW", color: "bg-sky-100 text-sky-700", company: "Brightside Health", email: "demi@brightside.health", phone: "+1 (310) 555-0146", channel: "facebook", handle: "Demi Wilkinson", assigned: "Maya Chen", lastSeen: "Active yesterday", tags: ["Healthcare"] },
    { id: "c5", name: "Candice Wu", initials: "CW", color: "bg-emerald-100 text-emerald-700", company: "Goodwell Market", email: "candice@goodwell.co", phone: "+1 (510) 555-0183", channel: "webchat", handle: "candice.w", assigned: "Alex Morgan", lastSeen: "Online now", tags: ["Retail", "High intent"] },
    { id: "c6", name: "Natali Craig", initials: "NC", color: "bg-rose-100 text-rose-700", company: "Studio Forma", email: "natali@studioforma.design", phone: "+1 (917) 555-0129", channel: "whatsapp", handle: "+1 917 555 0129", assigned: "Jordan Lee", lastSeen: "Active 3h ago", tags: ["Design partner"] },
    { id: "c7", name: "Drew Cano", initials: "DC", color: "bg-indigo-100 text-indigo-700", company: "Mono Creative", email: "drew@mono.design", phone: "+1 (202) 555-0164", channel: "email", handle: "drewcano", assigned: "Maya Chen", lastSeen: "Active 2d ago", tags: ["Onboarding"] },
    { id: "c8", name: "Andi Lane", initials: "AL", color: "bg-orange-100 text-orange-700", company: "Cedar & Stone", email: "andi@cedarstone.com", phone: "+1 (503) 555-0105", channel: "facebook", handle: "Andi Lane", assigned: "Alex Morgan", lastSeen: "Active 4d ago", tags: ["Wholesale"] },
  ],
  conversations: [
    { id: "v1", contactId: "c1", channel: "whatsapp", preview: "That sounds perfect, thank you!", time: "2m", unread: 2, messages: [
      { id: "m1", from: "system", kind: "note", text: "Olivia started this conversation via WhatsApp", time: "10:24 AM" },
      { id: "m2", from: "contact", text: "Hi! I had a question about upgrading our workspace plan.", time: "10:25 AM" },
      { id: "m3", from: "agent", text: "Of course, Olivia. I can help with that. How many seats are you looking to add?", time: "10:27 AM" },
      { id: "m4", from: "contact", text: "We’re growing quickly and need around 15 more seats before the end of the month.", time: "10:29 AM" },
      { id: "m5", from: "agent", text: "That sounds perfect, thank you! I’ve put together a tailored plan for your team. Want me to send it over?", time: "10:31 AM" },
      { id: "m6", from: "contact", text: "That sounds perfect, thank you!", time: "10:32 AM" },
    ] },
    { id: "v2", contactId: "c2", channel: "email", preview: "Re: Your recent order #48291", time: "18m", unread: 1, messages: [
      { id: "m7", from: "contact", kind: "email", subject: "Re: Your recent order #48291", text: "Hello team, I’m checking in on my recent order. The tracking page hasn’t updated in a few days — could you take a look?\n\nThanks,\nPhoenix", time: "9:54 AM" },
      { id: "m8", from: "agent", kind: "email", subject: "Re: Your recent order #48291", text: "Hi Phoenix, I’m sorry for the delay. I’ve reached out to our shipping team and will have an update for you shortly.", time: "10:02 AM" },
    ] },
    { id: "v3", contactId: "c3", channel: "instagram", preview: "Love the new color palette!", time: "42m", unread: 0, messages: [
      { id: "m9", from: "contact", text: "Hey! Just saw the new launch. Love the new color palette!", time: "9:18 AM" },
      { id: "m10", from: "agent", text: "Thank you so much, Lana! The team worked hard on those. Is there a shade you’d love to see next?", time: "9:23 AM" },
    ] },
    { id: "v4", contactId: "c4", channel: "facebook", preview: "Is there a store near Santa Monica?", time: "1h", unread: 0, messages: [
      { id: "m11", from: "contact", text: "Hi, is there a store near Santa Monica? I’d love to try a few things in person.", time: "8:50 AM" },
      { id: "m12", from: "agent", text: "Hi Demi! Our closest location is in Venice, just a short drive away. I’ll send you the details.", time: "9:01 AM" },
    ] },
    { id: "v5", contactId: "c5", channel: "webchat", preview: "The checkout keeps timing out for me", time: "2h", unread: 3, messages: [
      { id: "m13", from: "contact", text: "The checkout keeps timing out for me when I try to pay with my card.", time: "8:14 AM" },
      { id: "m14", from: "agent", text: "Sorry about that, Candice. Let’s get this sorted. What browser are you using?", time: "8:19 AM" },
    ] },
    { id: "v6", contactId: "c6", channel: "whatsapp", preview: "I’ll send the mockups across today", time: "3h", unread: 0, messages: [
      { id: "m15", from: "contact", text: "I’ll send the mockups across today so you can share them with your team.", time: "7:32 AM" },
    ] },
    { id: "v7", contactId: "c7", channel: "email", preview: "Could we schedule an onboarding call?", time: "5h", unread: 0, messages: [
      { id: "m16", from: "contact", kind: "email", subject: "Onboarding session", text: "Hi, we’re ready to get started and would love to book a 30-minute onboarding call this week. What times work for your team?", time: "6:21 AM" },
    ] },
    { id: "v8", contactId: "c8", channel: "facebook", preview: "Thanks for getting back to me", time: "1d", unread: 0, messages: [
      { id: "m17", from: "contact", text: "Thanks for getting back to me. I’ll review the wholesale catalog and follow up soon.", time: "Yesterday" },
    ] },
  ],
  cases: [
    { id: "CS-2048", title: "Checkout session timing out", contactId: "c5", priority: "High", channel: "webchat", status: "Open", updated: "12m ago", notes: ["Customer reports timeout when submitting card details.", "Asked customer which browser and device they’re using."] },
    { id: "CS-2047", title: "Order tracking hasn’t updated", contactId: "c2", priority: "Medium", channel: "email", status: "Open", updated: "28m ago", notes: ["Order #48291 shipped 3 days ago.", "Escalated to fulfillment team for carrier scan."] },
    { id: "CS-2046", title: "Workspace seat expansion", contactId: "c1", priority: "Medium", channel: "whatsapp", status: "In Progress", updated: "1h ago", notes: ["Preparing a custom quote for 15 additional seats."] },
    { id: "CS-2045", title: "Reschedule onboarding session", contactId: "c7", priority: "Low", channel: "email", status: "In Progress", updated: "2h ago", notes: ["Shared availability for Thursday and Friday."] },
    { id: "CS-2044", title: "Store location near Santa Monica", contactId: "c4", priority: "Low", channel: "facebook", status: "Waiting on Customer", updated: "4h ago", notes: ["Sent Venice store address and opening hours.", "Waiting to hear which products they’d like to try."] },
    { id: "CS-2043", title: "Color palette feedback", contactId: "c3", priority: "Low", channel: "instagram", status: "Resolved", updated: "Yesterday", notes: ["Thanked customer for the feedback.", "Added requested sage tone to the product feedback board."] },
  ],
  interactions: [
    { id: "i1", contactId: "c1", type: "Call", summary: "Quarterly check-in — discussed upcoming seat expansion.", date: "Today, 9:42 AM", followUp: true },
    { id: "i2", contactId: "c2", type: "Note", summary: "Customer prefers email updates for order changes.", date: "Yesterday, 3:15 PM", followUp: false },
    { id: "i3", contactId: "c5", type: "Meeting", summary: "Product walkthrough with the retail team.", date: "Oct 22, 11:00 AM", followUp: true },
    { id: "i4", contactId: "c3", type: "Note", summary: "Interested in early access to the new collection.", date: "Oct 21, 2:30 PM", followUp: false },
  ],
}
