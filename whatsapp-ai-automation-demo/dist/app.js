(function () {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const chat = $("#chat");
  const toast = $("#toast");
  const messageInput = $("#messageInput");
  const suggestionBox = $("#suggestionBox");
  const suggestedReply = $("#suggestedReply");
  const approvalToggle = $("#approvalToggle");
  let toastTimer;

  const scenarios = {
    refund: {
      match: /refund|money back|charged/i,
      intent: "Refund request",
      confidence: "92% confidence",
      time: "Not provided",
      risk: "High · human required",
      reply: "I’m sorry this needs attention. I’ve sent the conversation and payment details to a team member. They’ll review it before any refund is issued.",
      human: true
    },
    human: {
      match: /person|human|someone|agent|representative/i,
      intent: "Human assistance",
      confidence: "99% confidence",
      time: "Requested now",
      risk: "Medium · handoff",
      reply: "Absolutely. I’m handing this conversation to a team member now, and I’ll keep your message and details attached so you don’t have to repeat yourself.",
      human: true
    },
    reschedule: {
      match: /reschedule|change|move|different time/i,
      intent: "Reschedule appointment",
      confidence: "95% confidence",
      time: "Needs confirmation",
      risk: "Low",
      reply: "I can help move your appointment. I found openings Friday at 2:30 PM and Monday at 10:00 AM. Which one works better?",
      human: false
    },
    booking: {
      match: /book|appointment|consultation|available|friday/i,
      intent: "Book appointment",
      confidence: "96% confidence",
      time: "Friday · 4:00 PM",
      risk: "Low",
      reply: "I can help with that. I found openings Friday at 2:30 PM and 4:00 PM. Which time works better?",
      human: false
    },
    unknown: {
      match: /.*/,
      intent: "Needs clarification",
      confidence: "61% confidence",
      time: "Not provided",
      risk: "Medium · review",
      reply: "I want to make sure I understand. Are you trying to book an appointment, change one, or speak with a team member?",
      human: true
    }
  };

  function addMessage(text, direction, label) {
    const wrapper = document.createElement("div");
    wrapper.className = `message ${direction}`;
    const message = document.createElement("p");
    message.textContent = text;
    const time = document.createElement("time");
    time.textContent = label;
    wrapper.append(message, time);
    chat.appendChild(wrapper);
    chat.scrollTop = chat.scrollHeight;
  }

  function showToast(message, type) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.className = `toast show${type === "error" ? " error" : ""}`;
    toastTimer = setTimeout(() => { toast.className = "toast"; }, 3200);
  }

  function analyze(text) {
    return Object.values(scenarios).find((scenario) => scenario.match.test(text)) || scenarios.unknown;
  }

  function updateDecision(scenario) {
    $("#intentValue").textContent = scenario.intent;
    $("#confidence").textContent = scenario.confidence;
    $("#timeValue").textContent = scenario.time;
    $("#riskValue").textContent = scenario.risk;
    $("#riskValue").style.color = scenario.human ? "var(--red)" : "var(--green-dark)";
    suggestedReply.textContent = scenario.reply;
    $("#conversationStatus").textContent = scenario.human ? "Human review" : "AI handling";
    suggestionBox.hidden = false;
    approvalToggle.checked = scenario.human || approvalToggle.checked;
    const timeline = $("#timeline");
    timeline.innerHTML = `
      <li class="done"><i>✓</i><div><strong>Message received</strong><span>Webhook signature verified</span></div><time>Now</time></li>
      <li class="done"><i>✓</i><div><strong>Intent classified</strong><span>${scenario.intent} · ${scenario.confidence}</span></div><time>+1s</time></li>
      <li class="active"><i>3</i><div><strong>${scenario.human ? "Human review required" : "Reply ready"}</strong><span>${scenario.human ? "Automation paused safely" : "Within approved rules"}</span></div><time>Now</time></li>
      <li><i>4</i><div><strong>Update CRM</strong><span>Repeat-safe contact activity</span></div><time>Queued</time></li>
      <li><i>5</i><div><strong>Follow-up action</strong><span>Reminder or owner task</span></div><time>Queued</time></li>`;
  }

  $("#messageForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const value = messageInput.value.trim();
    if (!value) { showToast("Type a customer message first.", "error"); messageInput.focus(); return; }
    addMessage(value, "incoming", "Now · Customer");
    messageInput.value = "";
    updateDecision(analyze(value));
    showToast("Message classified. Review the suggested reply.");
  });

  document.querySelectorAll("[data-prompt]").forEach((button) => {
    button.addEventListener("click", () => {
      messageInput.value = button.dataset.prompt;
      messageInput.focus();
    });
  });

  $("#approveButton").addEventListener("click", () => {
    addMessage(suggestedReply.textContent, "outgoing", "Now · Approved reply");
    suggestionBox.hidden = true;
    $("#conversationStatus").textContent = "Workflow complete";
    const items = [...document.querySelectorAll("#timeline li")];
    items.forEach((item) => { item.className = "done"; item.querySelector("i").textContent = "✓"; });
    items[3].querySelector("span").textContent = "Customer activity saved once";
    items[4].querySelector("span").textContent = "Owner reminder scheduled";
    $("#conversationMetric").textContent = "129";
    showToast("Reply sent. CRM updated and follow-up scheduled.");
  });

  $("#editButton").addEventListener("click", () => {
    messageInput.value = suggestedReply.textContent;
    messageInput.focus();
    showToast("Suggested reply copied into the editor.");
  });

  $("#failureButton").addEventListener("click", () => {
    const timeline = $("#timeline");
    timeline.innerHTML = `
      <li class="done"><i>✓</i><div><strong>Message received</strong><span>Webhook stored safely</span></div><time>Now</time></li>
      <li class="done"><i>✓</i><div><strong>Intent classified</strong><span>No duplicate side effects</span></div><time>+1s</time></li>
      <li class="error"><i>!</i><div><strong>CRM temporarily unavailable</strong><span>Attempt 1 failed · request kept</span></div><time>Now</time></li>
      <li class="active"><i>4</i><div><strong>Retry queued</strong><span>Exponential backoff · next try in 30s</span></div><time>Queued</time></li>
      <li><i>5</i><div><strong>Human alert</strong><span>Opens only after retry limit</span></div><time>Standby</time></li>`;
    showToast("Failure contained. The message is queued for a safe retry.", "error");
  });

  $("#tourButton").addEventListener("click", async () => {
    showToast("Step 1: A customer asks to change an appointment.");
    addMessage("I need to reschedule my appointment", "incoming", "Now · Guided demo");
    await new Promise((resolve) => setTimeout(resolve, 700));
    updateDecision(scenarios.reschedule);
    showToast("Step 2: The agent identifies the request and drafts a reply.");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    $("#approveButton").focus();
    showToast("Step 3: Review the reply, then approve it when ready.");
  });

  $("#themeButton").addEventListener("click", () => {
    document.body.classList.toggle("dark");
    showToast(document.body.classList.contains("dark") ? "Dark theme on." : "Light theme on.");
  });

  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      const labels = { inbox: "Inbox demo is open.", workflows: "Workflow details are shown in the audit trail.", integrations: "Simulated integrations are shown below.", health: "System health: all demo services are available." };
      showToast(labels[button.dataset.view]);
      if (button.dataset.view !== "inbox") document.querySelector(".architecture-section").scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });
})();
