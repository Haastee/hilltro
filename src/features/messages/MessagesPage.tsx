import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { messageService } from "../../app/services";
import type { Conversation } from "../../types/domain";

export function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [warning, setWarning] = useState("");
  const [params] = useSearchParams();
  const propertyId = params.get("property");
  useEffect(() => { messageService.conversations().then(setConversations); }, []);
  const visibleConversations = propertyId ? conversations.map((conversation) => ({ ...conversation, subject: `${conversation.subject} · property ${propertyId}` })) : conversations;
  const active = visibleConversations[0];

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = String(new FormData(event.currentTarget).get("body"));
    try {
      await messageService.sendMessage(active.id, body);
      setWarning("");
    } catch (err) {
      setWarning(err instanceof Error ? err.message : "Message blocked.");
    }
  }

  return (
    <main className="page">
      <section className="hero"><h1>Messages</h1><p>Unread counts, attachments, read receipts and contact protection keep rental communications inside Haaste.</p>{propertyId && <span className="badge orange">Filtered to property {propertyId}</span>}</section>
      <section className="messenger">
        <aside className="card step-list">{visibleConversations.map((conversation) => <button className="step current" key={conversation.id}>{conversation.subject} ({conversation.unreadCount})</button>)}</aside>
        <article className="card thread">
          <h2>{active?.subject || "Conversation"}</h2>
          <div>{active?.messages.map((message) => <p className="bubble" key={message.id}>{message.body}<br /><small>Delivered · read</small></p>)}</div>
          <form onSubmit={send} className="form-grid">
            <p className="form-note">* Required field</p>
            <label>Attachment (optional)<input type="file" /></label>
            <label>Message *<input name="body" placeholder="Write a secure message" required /></label>
            {warning && <p className="badge orange">{warning}</p>}
            <button className="btn primary">Send</button>
          </form>
        </article>
      </section>
    </main>
  );
}
