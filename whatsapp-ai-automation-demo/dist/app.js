(function () {
  "use strict";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  const conversations = {
    maya: {
      name: "Maya Rodriguez", initials: "MR", color: "sand", since: "Mar 2026", last: "Aug 18",
      status: "AI handling", statusClass: "ai",
      messages: [
        ["Hi, I need help booking a first consultation. Do you have anything this Friday afternoon?", "incoming", "9:41 AM"],
        ["Hi Maya! I found two Friday openings: 2:30 PM and 4:00 PM. Which works better?", "outgoing", "9:41 AM · AI reply"],
        ["4:00 works. Is there anything I need to bring?", "incoming", "9:42 AM"]
      ],
      scenario: "booking"
    },
    jordan: {
      name: "Jordan Lee", initials: "JL", color: "blue", since: "Jan 2026", last: "Sep 02",
      status: "Human review", statusClass: "review",
      messages: [
        ["I was charged twice for yesterday's visit. I need one charge refunded.", "incoming", "9:38 AM"],
        ["I found the payment, but I won't issue a refund automatically. I've paused this and sent it to a person for review.", "outgoing", "9:38 AM · Guarded reply"],
        ["Okay. Please let me know when someone checks it.", "incoming", "9:39 AM"]
      ],
      scenario: "refund"
    },
    amina: {
      name: "Amina Khan", initials: "AK", color: "plum", since: "Jul 2026", last: "Aug 27",
      status: "AI handling", statusClass: "ai",
      messages: [
        ["Can I move my appointment from next Thursday to sometime after lunch?", "incoming", "9:31 AM"],
        ["Yes. I found two afternoon options, but I need the exact Thursday you mean before I change anything.", "outgoing", "9:31 AM · AI reply"],
        ["The Thursday after this one.", "incoming", "9:32 AM"]
      ],
      scenario: "unclear"
    }
  };

  const scenarios = {
    booking: {
      intent: "Book appointment", confidence: 96, priority: "Normal", time: "Friday · 4:00 PM",
      entities: ["Friday", "4:00 PM", "Consultation"], human: false,
      reply: "Great, I’ll hold Friday at 4:00 PM. Please bring a photo ID and arrive 10 minutes early. Would you like me to confirm it?",
      policyTitle: "Allowed with approval", policyReason: "Booking can proceed after a person checks the reply.",
      actions: [["Hold appointment", "Scheduling API · write"], ["Update contact", "CRM · repeat-safe write"], ["Schedule reminder", "Workflow queue · 24 hours"]]
    },
    reschedule: {
      intent: "Reschedule appointment", confidence: 95, priority: "Normal", time: "Needs confirmation",
      entities: ["Appointment", "Date change"], human: false,
      reply: "I can help move your appointment. I found openings Friday at 2:30 PM and Monday at 10:00 AM. Which one works better?",
      policyTitle: "Allowed with approval", policyReason: "The reply can offer available times, but the change waits for confirmation.",
      actions: [["Read availability", "Scheduling API · read"], ["Offer two times", "WhatsApp · draft"], ["Wait for confirmation", "No write yet"]]
    },
    refund: {
      intent: "Refund request", confidence: 98, priority: "High", time: "Not provided",
      entities: ["Duplicate charge", "$89.00", "Refund"], human: true,
      reply: "I’m sorry about the duplicate charge. I found the payment and sent it to a team member for review. No refund will happen until they approve it.",
      policyTitle: "Blocked for human review", policyReason: "The agent can gather details, but it cannot move money or promise a refund.",
      actions: [["Lock automated action", "Payment policy · blocked"], ["Attach payment details", "CRM · read only"], ["Create urgent task", "Owner queue · high priority"]]
    },
    human: {
      intent: "Human assistance", confidence: 99, priority: "High", time: "Requested now",
      entities: ["Human requested", "Conversation history"], human: true,
      reply: "Absolutely. I’m handing this conversation to a team member now, with the full message history attached so you don’t have to repeat yourself.",
      policyTitle: "Immediate handoff", policyReason: "A direct request for a person always pauses automation.",
      actions: [["Pause automation", "Conversation · locked"], ["Attach transcript", "CRM · secure note"], ["Notify available owner", "Handoff queue · urgent"]]
    },
    unclear: {
      intent: "Needs clarification", confidence: 68, priority: "Normal", time: "Ambiguous date",
      entities: ["Thursday", "After lunch", "Date unclear"], human: true,
      reply: "Just to make sure I have the correct date, do you mean Thursday, September 17? Once you confirm, I’ll show the available afternoon times.",
      policyTitle: "Paused for clarification", policyReason: "The date is unclear, so the agent asks one question before changing data.",
      actions: [["Ask one question", "WhatsApp · safe reply"], ["Wait for answer", "Workflow · paused"], ["Require exact date", "Validation · required"]]
    }
  };

  const initialEvents = [
    { id: "evt_7QF2M9", customer: "Maya Rodriguez", action: "Intent classified", status: "success", time: "9:42:04 AM" },
    { id: "evt_2AK8P1", customer: "Jordan Lee", action: "Refund blocked", status: "review", time: "9:38:16 AM" },
    { id: "evt_8DX4L0", customer: "Amina Khan", action: "Clarification requested", status: "review", time: "9:31:49 AM" },
    { id: "evt_4MB1R7", customer: "Leo Martin", action: "CRM contact updated", status: "success", time: "9:26:02 AM" },
    { id: "evt_1CG9W5", customer: "Noah Chen", action: "Reminder scheduled", status: "success", time: "9:17:44 AM" }
  ];

  let activeConversation = "maya";
  let events = initialEvents.map((event) => ({ ...event }));
  let approvalCount = 2;
  let toastTimer;
  let demoToken = 0;

  const chat = $("#chat");
  const toast = $("#toast");
  const dialog = $("#eventDialog");

  function escapeText(value) { return String(value ?? ""); }

  function showToast(message, type = "normal") {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.className = `toast show${type === "error" ? " error" : ""}`;
    toastTimer = setTimeout(() => { toast.className = "toast"; }, 3000);
  }

  function messageElement(text, direction, time) {
    const wrapper = document.createElement("div");
    wrapper.className = `message ${direction}`;
    const body = document.createElement("p");
    body.textContent = escapeText(text);
    const stamp = document.createElement("time");
    stamp.textContent = escapeText(time);
    wrapper.append(body, stamp);
    return wrapper;
  }

  function renderChat(conversation) {
    chat.replaceChildren(...conversation.messages.map((message) => messageElement(...message)));
    chat.scrollTop = chat.scrollHeight;
  }

  function renderConversation(key) {
    activeConversation = key;
    const conversation = conversations[key];
    $$(".conversation-item").forEach((item) => item.classList.toggle("active", item.dataset.conversation === key));
    $("#activeName").textContent = conversation.name;
    $("#activeAvatar").textContent = conversation.initials;
    $("#activeAvatar").className = `contact-avatar ${conversation.color}`;
    $("#customerSince").textContent = conversation.since;
    $("#lastAppointment").textContent = conversation.last;
    $("#conversationStatus").textContent = conversation.status;
    $("#conversationStatus").className = `status-chip ${conversation.statusClass}`;
    renderChat(conversation);
    updateDecision(scenarios[conversation.scenario], conversation.name);
  }

  function updateDecision(scenario, customerName = conversations[activeConversation].name) {
    $("#intentValue").textContent = scenario.intent;
    $("#priorityValue").textContent = scenario.priority;
    $("#customerValue").textContent = customerName;
    $("#timeValue").textContent = scenario.time;
    $("#confidenceBadge").textContent = `${scenario.confidence}%`;
    $("#confidenceBar").style.width = `${scenario.confidence}%`;
    $("#confidenceBadge").classList.toggle("low", scenario.confidence < 75);
    $("#entityTags").replaceChildren(...scenario.entities.map((entity) => {
      const tag = document.createElement("b"); tag.textContent = entity; return tag;
    }));
    $("#suggestedReply").textContent = scenario.reply;
    $("#policyTitle").textContent = scenario.policyTitle;
    $("#policyReason").textContent = scenario.policyReason;
    $("#policyIcon").textContent = scenario.human ? "!" : "✓";
    $("#policyCard").className = `policy-card ${scenario.human ? "blocked" : "approved"}`;
    $("#policyLabel").textContent = scenario.human ? "Human review required" : "Inside policy";
    $("#policyLabel").className = scenario.human ? "blocked-label" : "";
    $("#suggestionBox").hidden = false;
    $("#toolPlan").replaceChildren(...scenario.actions.map(([title, subtitle], index) => {
      const item = document.createElement("li");
      const number = document.createElement("i"); number.textContent = String(index + 1);
      const copy = document.createElement("span");
      const strong = document.createElement("strong"); strong.textContent = title;
      const small = document.createElement("small"); small.textContent = subtitle;
      copy.append(strong, small); item.append(number, copy); return item;
    }));
    $("#workflowPolicyText").textContent = scenario.human ? "Automation paused safely" : "Human approval required";
    $("#conversationStatus").textContent = scenario.human ? "Human review" : "AI handling";
    $("#conversationStatus").className = `status-chip ${scenario.human ? "review" : "ai"}`;
  }

  function classify(text) {
    if (/refund|charged twice|money back|duplicate charge/i.test(text)) return scenarios.refund;
    if (/person|human|representative|real agent|someone/i.test(text)) return scenarios.human;
    if (/reschedule|change|move|different time/i.test(text)) return scenarios.reschedule;
    if (/book|appointment|consultation|available|friday/i.test(text)) return scenarios.booking;
    return scenarios.unclear;
  }

  function addEvent(action, status, customer = conversations[activeConversation].name) {
    const id = `evt_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    events.unshift({ id, customer, action, status, time: "Now" });
    renderEvents();
    return id;
  }

  function workflowState(state) {
    const nodes = $$(".workflow-node");
    const connectors = $$(".connector");
    nodes.forEach((node) => { node.className = "workflow-node"; });
    connectors.forEach((connector) => { connector.className = "connector"; });
    if (state === "review") {
      nodes[0].classList.add("complete"); nodes[1].classList.add("complete"); nodes[2].classList.add("active");
      connectors[0].classList.add("complete"); connectors[1].classList.add("active");
      $("#eventSummary").children[2].textContent = "Last action: awaiting approval";
    }
    if (state === "complete") {
      nodes.forEach((node) => node.classList.add("complete")); connectors.forEach((connector) => connector.classList.add("complete"));
      nodes.forEach((node) => { node.lastElementChild.textContent = "✓"; });
      $("#eventSummary").children[2].textContent = "Last action: workflow completed";
    }
    if (state === "failed") {
      nodes[0].classList.add("complete"); nodes[1].classList.add("complete"); nodes[2].classList.add("complete"); nodes[3].classList.add("failed"); nodes[3].lastElementChild.textContent = "!";
      connectors[0].classList.add("complete"); connectors[1].classList.add("complete"); connectors[2].classList.add("complete");
      $("#eventSummary").children[2].textContent = "Last action: queued for safe retry";
    }
  }

  function updateApprovalCount(value) {
    approvalCount = Math.max(0, value);
    ["#sidebarApprovalCount", "#tabApprovalCount", "#reviewMetric"].forEach((selector) => { $(selector).textContent = String(approvalCount); });
    $("#reviewMetricText").textContent = approvalCount ? `${approvalCount} action${approvalCount === 1 ? "" : "s"} waiting` : "Queue is clear";
    $("#approvalEmpty").hidden = approvalCount !== 0;
    $("#approvalList").hidden = approvalCount === 0;
  }

  function renderEvents() {
    const query = $("#eventSearch").value.trim().toLowerCase();
    const filter = $("#eventFilter").value;
    const filtered = events.filter((event) => {
      const matchesText = [event.id, event.customer, event.action].some((value) => value.toLowerCase().includes(query));
      return matchesText && (filter === "all" || event.status === filter);
    });
    const rows = filtered.map((event) => {
      const row = document.createElement("tr");
      [event.id, event.customer, event.action].forEach((value, index) => {
        const cell = document.createElement("td");
        if (index === 0) { const code = document.createElement("code"); code.textContent = value; cell.append(code); }
        else cell.textContent = value;
        row.append(cell);
      });
      const status = document.createElement("td");
      const statusText = document.createElement("span"); statusText.className = `table-status ${event.status}`; statusText.textContent = event.status;
      status.append(statusText); row.append(status);
      const time = document.createElement("td"); time.textContent = event.time; row.append(time);
      const action = document.createElement("td"); const button = document.createElement("button");
      button.className = "text-button"; button.textContent = "Inspect"; button.addEventListener("click", () => openEvent(event)); action.append(button); row.append(action);
      return row;
    });
    $("#eventTableBody").replaceChildren(...rows);
    $("#eventEmpty").hidden = rows.length !== 0;
  }

  function setTab(tabName) {
    $$("[role=tab]").forEach((tab) => tab.setAttribute("aria-selected", String(tab.dataset.tab === tabName)));
    ["approvals", "events", "integrations"].forEach((name) => {
      const view = $(`#${name}View`); view.hidden = name !== tabName; view.classList.toggle("active", name === tabName);
    });
    if (tabName === "events") renderEvents();
  }

  function openEvent(event = events[0]) {
    const payload = {
      id: event.id, source: "whatsapp_cloud_api_simulation", customer: event.customer,
      action: event.action, status: event.status, idempotency_key: `${event.id}:crm:update`,
      policy: { human_approval: true, money_movement: "blocked" },
      audit: { received_at: "2026-09-10T09:42:03-04:00", attempt: 1, contains_real_customer_data: false }
    };
    $("#dialogTitle").textContent = event.id;
    $("#eventJson").textContent = JSON.stringify(payload, null, 2);
    if (typeof dialog.showModal === "function") dialog.showModal();
  }

  function closeDialog() { if (dialog.open) dialog.close(); }
  function delay(milliseconds) { return new Promise((resolve) => setTimeout(resolve, milliseconds)); }

  async function runGuidedDemo() {
    const token = ++demoToken;
    $("#guidedDemoButton").disabled = true; $("#stopDemoButton").hidden = false;
    const steps = [
      [12, "Step 1 of 5", "A customer says they were charged twice. The agent reads the message and identifies a refund request."],
      [34, "Step 2 of 5", "The money rule blocks an automatic refund and requires a person to review it."],
      [56, "Step 3 of 5", "The agent prepares a safe reply and attaches the payment details without changing the payment."],
      [78, "Step 4 of 5", "A simulated CRM failure keeps the action in a retry queue instead of losing it."],
      [100, "Step 5 of 5", "The retry succeeds once. The full decision and action history stays available for review."]
    ];
    renderConversation("jordan");
    for (let index = 0; index < steps.length; index += 1) {
      if (token !== demoToken) return;
      const [progress, label, copy] = steps[index];
      $("#storyProgress").style.width = `${progress}%`; $("#storyStep").textContent = label; $("#storyText").textContent = copy;
      if (index === 1) { updateDecision(scenarios.refund, "Jordan Lee"); workflowState("review"); }
      if (index === 2) { $("#suggestionBox").scrollIntoView({ behavior: "smooth", block: "center" }); }
      if (index === 3) { simulateFailure(false); }
      if (index === 4) { retryWorkflow(false); }
      await delay(1300);
    }
    if (token !== demoToken) return;
    $("#guidedDemoButton").disabled = false; $("#stopDemoButton").hidden = true;
    showToast("Guided demo complete. Try any control yourself.");
  }

  function stopGuidedDemo() {
    demoToken += 1; $("#guidedDemoButton").disabled = false; $("#stopDemoButton").hidden = true;
    $("#storyStep").textContent = "Paused"; $("#storyText").textContent = "The guided demo stopped. You can keep testing the controls.";
  }

  function simulateFailure(showMessage = true) {
    workflowState("failed"); $("#retryButton").hidden = false;
    $("#crmHealth").className = "health failed"; $("#crmHealth").innerHTML = "<i></i> Simulated outage";
    $("#crmStatusText").textContent = "Write failed · request preserved";
    $("#queueHealth").className = "health waiting"; $("#queueHealth").innerHTML = "<i></i> 1 waiting";
    $("#queueStatusText").textContent = "Retry in 30 seconds";
    addEvent("CRM update queued", "failed");
    if (showMessage) showToast("CRM unavailable. The request was preserved and queued.", "error");
  }

  function retryWorkflow(showMessage = true) {
    workflowState("complete"); $("#retryButton").hidden = true;
    $("#crmHealth").className = "health healthy"; $("#crmHealth").innerHTML = "<i></i> Simulated healthy";
    $("#crmStatusText").textContent = "Retry accepted once · no duplicate";
    $("#queueHealth").className = "health healthy"; $("#queueHealth").innerHTML = "<i></i> Ready";
    $("#queueStatusText").textContent = "0 events waiting";
    addEvent("CRM retry completed", "success");
    if (showMessage) showToast("Retry succeeded once. No duplicate update was created.");
  }

  $$(".conversation-item").forEach((item) => item.addEventListener("click", () => renderConversation(item.dataset.conversation)));

  $("#messageForm").addEventListener("submit", (event) => {
    event.preventDefault(); const input = $("#messageInput"); const value = input.value.trim();
    if (!value) { showToast("Type a customer message first.", "error"); input.focus(); return; }
    conversations[activeConversation].messages.push([value, "incoming", "Now · Test message"]);
    chat.append(messageElement(value, "incoming", "Now · Test message")); input.value = ""; chat.scrollTop = chat.scrollHeight;
    const scenario = classify(value); updateDecision(scenario); workflowState("review");
    addEvent(`${scenario.intent} classified`, scenario.human ? "review" : "success");
    showToast(scenario.human ? "Automation paused for human review." : "Message understood. Review the suggested reply.");
  });

  $$("[data-prompt]").forEach((button) => button.addEventListener("click", () => { $("#messageInput").value = button.dataset.prompt; $("#messageInput").focus(); }));

  $("#approveButton").addEventListener("click", () => {
    const reply = $("#suggestedReply").textContent; conversations[activeConversation].messages.push([reply, "outgoing", "Now · Approved reply"]);
    chat.append(messageElement(reply, "outgoing", "Now · Approved reply")); chat.scrollTop = chat.scrollHeight; $("#suggestionBox").hidden = true;
    $("#conversationStatus").textContent = "Workflow complete"; $("#conversationStatus").className = "status-chip complete";
    workflowState("complete"); addEvent("Approved workflow completed", "success"); $("#conversationMetric").textContent = "129";
    showToast("Reply sent. CRM updated once and follow-up scheduled.");
  });

  $("#editButton").addEventListener("click", () => { $("#messageInput").value = $("#suggestedReply").textContent; $("#messageInput").focus(); showToast("Reply copied into the editor."); });
  $("#handoffButton").addEventListener("click", () => { $("#conversationStatus").textContent = "Assigned to a person"; $("#conversationStatus").className = "status-chip review"; $("#suggestionBox").hidden = true; addEvent("Conversation handed off", "review"); showToast("Conversation assigned with the full history attached."); });

  $("#moreButton").addEventListener("click", () => { $("#contactSummary").hidden = !$("#contactSummary").hidden; });
  $("#inboxFilterButton").addEventListener("click", () => { $("#inboxSearch").hidden = !$("#inboxSearch").hidden; if (!$("#inboxSearch").hidden) $("#conversationSearch").focus(); });
  $("#conversationSearch").addEventListener("input", (event) => { const value = event.target.value.toLowerCase(); $$(".conversation-item").forEach((item) => { item.hidden = !item.textContent.toLowerCase().includes(value); }); });

  $$("[data-target]").forEach((button) => button.addEventListener("click", () => {
    if (button.dataset.tab) setTab(button.dataset.tab);
    $$(".nav-item").forEach((item) => item.classList.toggle("active", item === button));
    document.getElementById(button.dataset.target).scrollIntoView({ behavior: "smooth", block: "start" });
  }));
  $$("[role=tab]").forEach((button) => button.addEventListener("click", () => setTab(button.dataset.tab)));

  $$("[data-action]").forEach((button) => button.addEventListener("click", () => {
    const item = button.closest("article");
    if (button.dataset.action === "details") { setTab("events"); renderEvents(); showToast("Related audit events are open."); return; }
    item.remove(); updateApprovalCount(approvalCount - 1); addEvent("Approval queue item resolved", "success", item.textContent.includes("Jordan") ? "Jordan Lee" : "Amina Khan"); showToast("Approval item resolved and recorded.");
  }));

  $("#eventSearch").addEventListener("input", renderEvents); $("#eventFilter").addEventListener("change", renderEvents);
  $("#failureButton").addEventListener("click", () => simulateFailure(true)); $("#retryButton").addEventListener("click", () => retryWorkflow(true));
  $("#inspectEventButton").addEventListener("click", () => openEvent(events[0])); $("#policyButton").addEventListener("click", () => openEvent({ ...events[0], action: "Policy checkpoint inspected" }));
  $("#closeDialogButton").addEventListener("click", closeDialog); $("#doneDialogButton").addEventListener("click", closeDialog);
  $("#copyEventButton").addEventListener("click", async () => { try { await navigator.clipboard.writeText($("#eventJson").textContent); showToast("Event JSON copied."); } catch { showToast("Copy is unavailable in this browser.", "error"); } });

  $("#exportButton").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify({ demo: true, fictional_data: true, events }, null, 2)], { type: "application/json" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "relaydesk-demo-audit.json"; link.click(); URL.revokeObjectURL(link.href); showToast("Fictional audit log downloaded.");
  });

  $("#approvalToggle").addEventListener("change", (event) => { if (!event.target.checked) { event.target.checked = true; showToast("This demo keeps high-risk approval locked on.", "error"); } });
  $("#themeButton").addEventListener("click", () => { document.body.classList.toggle("dark"); showToast(document.body.classList.contains("dark") ? "Dark mode on." : "Light mode on."); });
  $("#guidedDemoButton").addEventListener("click", runGuidedDemo); $("#stopDemoButton").addEventListener("click", stopGuidedDemo);
  $("#resetButton").addEventListener("click", () => { window.location.reload(); });

  renderConversation("maya"); renderEvents(); workflowState("review");
})();
