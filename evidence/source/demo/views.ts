import { randomUUID } from "node:crypto";
import { escapeHtml as e } from "../src/http/html.js";
import { members, type Scenario, type Session } from "./fixtures.js";

function page(title: string, body: string) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${e(title)} | Northstar</title><link rel="stylesheet" href="/bank.css"></head><body><main><div class="eyebrow">MEMBER SERVICES <span>INTERNAL WORKSPACE</span></div>${body}</main></body></html>`;
}

export function shell(scenario: Scenario) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Northstar Member Services</title><link rel="stylesheet" href="/bank.css"></head><body class="shell"><header><div class="bank-mark">N<span>Northstar<small>FEDERAL CREDIT UNION</small></span></div><div class="shell-note">Training environment <span class="dot"></span></div></header><div class="bank-nav">Member services <span>Account servicing</span><small>All records are synthetic</small></div><iframe name="${scenario === "frame-drift" ? "moved-workspace" : "workspace"}" title="Member workspace" src="/search"></iframe></body></html>`;
}

export function search(scenario: Scenario) {
  const id = randomUUID();
  return page(
    "Member search",
    `<h1>Member search</h1><p class="intro">Find a member to review their accounts or prepare a service request.</p><section class="panel"><h2>Find a member</h2><form method="post" action="/find"><table class="form-table"><tbody><tr><td>Member number</td><td><input id="${id}" name="memberId" maxlength="32" autocomplete="off" required placeholder="Enter member number"></td></tr></tbody></table><div class="form-footer"><span>Exact member number required</span><button>Search members</button>${scenario === "ambiguous" ? "<button>Search members</button>" : ""}</div></form></section><aside class="training"><strong>Practice records</strong><p>Use <code>A1001</code> or <code>B1002</code>. This isolated application contains fictional accounts only.</p></aside>`,
  );
}

export function results(session: Session, scenario: Scenario) {
  if (scenario === "not-found" || !Object.hasOwn(members, session.memberId))
    return page(
      "Search results",
      `<h1>Search results</h1><section class="empty"><h2>Member not found</h2><p>No member matched the supplied number.</p><a href="/search">Return to search</a></section>`,
    );
  const member = members[session.memberId as keyof typeof members];
  return page(
    "Search results",
    `<h1>Search results</h1><p class="intro">One member matches your search.</p><section class="panel"><table class="data-table"><thead><tr><th>Member</th><th>Member number</th><th>Status</th><th>Action</th></tr></thead><tbody><tr><td><strong>${member.name}</strong><small>Individual membership</small></td><td>${e(session.memberId)}</td><td><span class="tag">Active</span></td><td><a class="button" href="/member">Open member</a></td></tr></tbody></table></section>`,
  );
}

function interruption(scenario: Scenario) {
  if (scenario === "notice")
    return `<section role="dialog" aria-label="Service notice" class="notice"><h2>Service notice</h2><p>Account balances are current as of this session.</p><form action="/ack" method="post"><button>Dismiss notice</button></form></section>`;
  if (scenario === "intervention")
    return `<div class="modal-shade"><section role="dialog" aria-label="Operator acknowledgment" aria-modal="true" class="notice"><span class="eyebrow">OPERATOR ACTION</span><h2>Operator acknowledgment</h2><p>A servicing notice requires review before continuing. Acknowledge this synthetic training notice to return to the member record.</p><form action="/ack" method="post"><button>Acknowledge notice</button></form></section></div>`;
  return "";
}

export function member(session: Session, scenario: Scenario) {
  if (scenario === "permission")
    return page(
      "Access restricted",
      `<h1>Permission denied</h1><p>Your current servicing role cannot view this member.</p>`,
    );
  if (scenario === "unavailable")
    return page(
      "Service unavailable",
      `<h1>Application unavailable</h1><p>The servicing application could not load this record.</p>`,
    );
  if (scenario === "session-expired" && !session.acknowledged)
    return page(
      "Session expired",
      `<h1>Session expired</h1><section class="panel"><p>Restore the training session to continue. No real credentials are required.</p><form action="/restore" method="post"><button>Restore demo session</button></form></section>`,
    );
  const record = members[session.memberId as keyof typeof members];
  if (!record) return results(session, "not-found");
  return page(
    "Member overview",
    `${!session.acknowledged ? interruption(scenario) : ""}<h1>Member overview</h1><p class="intro">${record.name} <span class="tag">Active member</span></p><section class="panel"><h2>Membership details</h2><table class="details"><tbody><tr><td>Member number</td><td>${e(scenario === "wrong-member" ? "OTHER-MEMBER" : session.memberId)}</td></tr><tr><td>Membership status</td><td>Active</td></tr></tbody></table></section><section class="panel"><div class="section-title"><h2>Accounts</h2><a href="/new">New sub-account</a></div>${scenario === "no-account" ? "<h3>Savings account not found</h3><p>This membership has no savings account.</p>" : '<table class="data-table"><thead><tr><th>Account</th><th>Type</th><th>Status</th><th>Action</th></tr></thead><tbody><tr><td>Primary savings</td><td>Savings</td><td><span class="tag">Open</span></td><td><a class="button" href="/savings">View savings</a></td></tr></tbody></table>'}</section>`,
  );
}

export function savings(session: Session, scenario: Scenario) {
  const record = members[session.memberId as keyof typeof members];
  if (!record) return results(session, "not-found");
  return page(
    "Savings account",
    `<h1>Savings account</h1><p class="intro">Primary savings <span class="tag">Open</span></p><section class="panel"><h2>Account details</h2><table class="details"><tbody><tr><td>Member number</td><td>${e(session.memberId)}</td></tr><tr><td>Account type</td><td>${scenario === "wrong-account-type" ? "checking" : "savings"}</td></tr><tr><td>Available balance</td><td class="balance">${scenario === "malformed-balance" ? "$1,23.00" : record.balance}</td></tr><tr><td>Currency</td><td>${scenario === "wrong-currency" ? "EUR" : "USD"}</td></tr></tbody></table><div class="form-footer"><span>Balance verified for this training session</span><a href="/member">Back to member</a></div></section>`,
  );
}

export function accountForm(session: Session) {
  return page(
    "New sub-account",
    `<h1>New sub-account</h1><p class="intro">Prepare account details. Nothing is opened until the final confirmation.</p><section class="panel"><h2>Account setup</h2><table class="details"><tbody><tr><td>Member number</td><td>${e(session.memberId)}</td></tr></tbody></table><form action="/review" method="post"><table class="form-table"><tbody><tr><td>Account type</td><td><select id="${randomUUID()}" name="accountType"><option value="savings">Savings</option><option value="checking">Checking</option></select></td></tr><tr><td>Account nickname</td><td><input id="${randomUUID()}" name="nickname" maxlength="40" required autocomplete="off"></td></tr></tbody></table><div class="form-footer"><a href="/member">Cancel</a><button>Review account</button></div></form></section>`,
  );
}

export function review(session: Session, scenario: Scenario) {
  if (
    scenario === "validation" ||
    !session.nickname.trim() ||
    session.nickname.length > 40 ||
    !["savings", "checking"].includes(session.accountType)
  )
    return page(
      "Validation error",
      `<h1>Validation rejected</h1><p>The account details do not meet the servicing requirements.</p><a href="/new">Return to account setup</a>`,
    );
  return page(
    "Review sub-account",
    `<h1>Review sub-account</h1><p class="intro">Review the prepared details. No account has been opened.</p><section class="panel"><h2>Prepared account</h2><table class="details"><tbody><tr><td>Member number</td><td>${e(session.memberId)}</td></tr><tr><td>Account type</td><td>${e(session.accountType)}</td></tr><tr><td>Account nickname</td><td>${e(session.nickname)}</td></tr><tr><td>Preparation status</td><td>ready-for-review</td></tr></tbody></table><div class="form-footer"><a href="/new">Edit details</a><form action="/commit" method="post"><button class="danger">Open account</button></form></div></section><aside class="training"><strong>Automation stops here</strong><p>Opening an account is outside the permitted capability. This review screen is the verified endpoint.</p></aside>`,
  );
}
