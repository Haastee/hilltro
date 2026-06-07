import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import { messageService } from "../../app/services";
import { FloatingInput } from "../../components/FloatingField";
import { HilltroAvatar } from "../../components/HilltroAvatar";
import type { Conversation } from "../../types/domain";
import { applicantById, propertyAddress } from "../../data/landlordProperties";

export function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [warning, setWarning] = useState("");
  const [params] = useSearchParams();
  const propertyId = params.get("property");
  const applicantId = params.get("applicant");
  async function refreshConversations() {
    setConversations(await messageService.conversations());
  }

  useEffect(() => { refreshConversations(); }, []);
  const matchedConversations = conversations
    .filter((conversation) => !propertyId || conversation.propertyId === propertyId)
    .filter((conversation) => !applicantId || conversation.applicantId === applicantId);
  const visibleConversations = matchedConversations.length || !propertyId || !applicantId ? matchedConversations : [{
    id: `draft:${propertyId}:${applicantId}`,
    subject: `${applicantById(applicantId)?.name || "Applicant"} · ${propertyAddress(propertyId)}`,
    unreadCount: 0,
    propertyId,
    applicantId,
    messages: []
  }];
  const active = visibleConversations[0];
  const contextAddress = propertyId ? propertyAddress(propertyId) : active?.propertyId ? propertyAddress(active.propertyId) : "";

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = String(new FormData(form).get("body"));
    if (!active) return;
    try {
      await messageService.sendMessage(active.id, body);
      form.reset();
      await refreshConversations();
      setWarning("");
    } catch (err) {
      setWarning(err instanceof Error ? err.message : "Message blocked.");
    }
  }

  return (
    <main className="page">
      <section className="hero"><h1>Messages</h1><p>Unread counts, attachments, read receipts and contact protection keep rental communications inside Hilltro.</p>{contextAddress && <span className="badge orange">Messages regarding {contextAddress}</span>}</section>
      {visibleConversations.length === 0 ? (
        <section className="card empty-message-state">
          <MessageSquare size={34} />
          <h2>No conversations yet</h2>
          <p className="muted">Messages will appear here once an applicant or landlord starts a property-linked conversation.</p>
        </section>
      ) : (
      <section className="messenger">
        <aside className="card step-list">{visibleConversations.map((conversation) => {
          const applicant = applicantById(conversation.applicantId);
          return <button className="step current message-list-item" key={conversation.id}><HilltroAvatar name={applicant?.name || conversation.subject} imageUrl={applicant?.profileImageUrl} size="sm" /><span>{conversation.subject} ({conversation.unreadCount})</span></button>;
        })}</aside>
        <article className="card thread">
          <div className="thread-heading"><HilltroAvatar name={applicantById(active.applicantId)?.name || active.subject} imageUrl={applicantById(active.applicantId)?.profileImageUrl} /><h2>{active.subject}</h2></div>
          {contextAddress && <p className="muted">Messages regarding {contextAddress}</p>}
          <div>{active?.messages.map((message) => <p className="bubble" key={message.id}>{message.body}<br /><small>Delivered · read</small></p>)}</div>
          <form onSubmit={send} className="form-grid" noValidate>
            <p className="form-note">* Required field</p>
            <label>Attachment (optional)<input type="file" /></label>
            <FloatingInput label="Message *" name="body" required />
            {warning && <p className="badge orange">{warning}</p>}
            <button className="btn primary">Send</button>
          </form>
        </article>
      </section>
      )}
    </main>
  );
}
