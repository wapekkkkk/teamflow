import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import AppLayout from "../components/AppLayout";

const MEMBER_TABS = [
  { id: "accepted", label: "My Members" },
  { id: "find", label: "Find Members" },
  { id: "requests", label: "Requests" },
];

function getInitials(name = "", email = "") {
  const source = name?.trim() || email?.trim() || "?";
  const parts = source.split(" ").filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

function MembersPage() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [requests, setRequests] = useState([]);
  const [formData, setFormData] = useState({ email: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("accepted");

  useEffect(() => {
    checkUserAndLoadData();
  }, []);

  const checkUserAndLoadData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      navigate("/login");
      return;
    }

    setUser(user);
    await fetchRequests(user.id);
  };

  const fetchRequests = async (userId) => {
    const { data, error } = await supabase
      .from("member_requests")
      .select(`
        id,
        sender_id,
        receiver_id,
        status,
        created_at,
        updated_at,
        sender:profiles!member_requests_sender_id_fkey (
          id,
          full_name,
          email
        ),
        receiver:profiles!member_requests_receiver_id_fkey (
          id,
          full_name,
          email
        )
      `)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    setRequests(data || []);
  };

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSendRequest = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (!user) {
      setMessage("User not found.");
      setLoading(false);
      return;
    }

    const email = formData.email.trim().toLowerCase();

    if (!email) {
      setMessage("Email is required.");
      setLoading(false);
      return;
    }

    const { data: targetUser, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("email", email)
      .maybeSingle();

    if (profileError || !targetUser) {
      setMessage("User not found. They need to register first.");
      setLoading(false);
      return;
    }

    if (targetUser.id === user.id) {
      setMessage("You cannot send a request to yourself.");
      setLoading(false);
      return;
    }

    const { data: existingRequest } = await supabase
      .from("member_requests")
      .select("id, status, sender_id, receiver_id")
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${targetUser.id}),and(sender_id.eq.${targetUser.id},receiver_id.eq.${user.id})`
      )
      .maybeSingle();

    if (existingRequest) {
      if (existingRequest.status === "pending") {
        setMessage("A pending request already exists between both users.");
      } else if (existingRequest.status === "accepted") {
        setMessage("You are already connected.");
      } else {
        setMessage("A previous request already exists. Update its status instead.");
      }
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("member_requests").insert([
      {
        sender_id: user.id,
        receiver_id: targetUser.id,
        status: "pending",
      },
    ]);

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setFormData({ email: "" });
    setMessage("Request sent successfully.");
    await fetchRequests(user.id);
    setLoading(false);
  };

  const handleUpdateRequest = async (requestId, status) => {
    const { error } = await supabase
      .from("member_requests")
      .update({ status })
      .eq("id", requestId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(`Request marked as ${status}.`);
    await fetchRequests(user.id);
  };

  const handleDeleteRequest = async (requestId) => {
    const { error } = await supabase
      .from("member_requests")
      .delete()
      .eq("id", requestId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Request removed successfully.");
    await fetchRequests(user.id);
  };

  const incomingRequests = useMemo(() => {
    if (!user) return [];
    return requests.filter(
      (request) => request.receiver_id === user.id && request.status === "pending"
    );
  }, [requests, user]);

  const outgoingRequests = useMemo(() => {
    if (!user) return [];
    return requests.filter(
      (request) => request.sender_id === user.id && request.status === "pending"
    );
  }, [requests, user]);

  const acceptedConnections = useMemo(() => {
    if (!user) return [];

    return requests
      .filter((request) => request.status === "accepted")
      .map((request) => {
        const isSender = request.sender_id === user.id;
        return {
          ...request,
          otherUser: isSender ? request.receiver : request.sender,
        };
      });
  }, [requests, user]);

  const filteredAcceptedConnections = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) return acceptedConnections;

    return acceptedConnections.filter((connection) => {
      const name = connection.otherUser?.full_name?.toLowerCase() || "";
      const email = connection.otherUser?.email?.toLowerCase() || "";
      return name.includes(term) || email.includes(term);
    });
  }, [acceptedConnections, searchTerm]);

  const totalRequests = incomingRequests.length + outgoingRequests.length;

  return (
    <AppLayout>
      <div className="app-page">
        <div className="app-shell members-shell">
          <div className="top-bar">
            <div>
              <h1 className="page-title">Members</h1>
              <p className="page-subtitle">
                Connect with teammates, manage requests, and view your accepted members.
              </p>
            </div>
          </div>

          <div className="members-tabs-wrap">
            <div className="members-tabs">
              {MEMBER_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`members-tab ${activeTab === tab.id ? "active" : ""}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                  {tab.id === "accepted" && (
                    <span className="members-tab-count">{acceptedConnections.length}</span>
                  )}
                  {tab.id === "requests" && totalRequests > 0 && (
                    <span className="members-tab-count">{totalRequests}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {message && <p className="message">{message}</p>}

          {activeTab === "accepted" && (
            <div className="members-tab-panel">
              <div className="card section-card members-hero-card">
                <div className="members-hero-top">
                  <div>
                    <h2 className="members-section-title">
                      My Members ({filteredAcceptedConnections.length})
                    </h2>
                    <p className="muted members-section-subtitle">
                      Search and manage your accepted connections.
                    </p>
                  </div>
                </div>

                <div className="members-search-row">
                  <input
                    type="text"
                    placeholder="Search members..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input members-search-input"
                  />
                </div>

                {filteredAcceptedConnections.length === 0 ? (
                  <div className="members-empty-state">
                    <h3>No members yet</h3>
                    <p className="muted">
                      Accepted connections will appear here once requests are approved.
                    </p>
                  </div>
                ) : (
                  <div className="members-card-list">
                    {filteredAcceptedConnections.map((connection) => {
                      const person = connection.otherUser;
                      return (
                        <div key={connection.id} className="members-person-card">
                          <div className="members-person-main">
                            <div className="members-avatar">
                              {getInitials(person?.full_name, person?.email)}
                            </div>

                            <div className="members-person-info">
                              <h3>{person?.full_name || "No name"}</h3>
                              <p>{person?.email}</p>
                              <span className="members-presence offline">Connected</span>
                            </div>
                          </div>

                          <div className="members-person-actions">
                            <button
                              type="button"
                              className="btn btn-danger"
                              onClick={() => handleDeleteRequest(connection.id)}
                            >
                              Remove Connection
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "find" && (
            <div className="members-tab-panel">
              <div className="members-find-layout">
                <div className="card section-card members-find-card">
                  <div className="members-find-icon">✉</div>

                  <div className="members-find-content">
                    <h2 className="members-section-title">Search by Email</h2>
                    <p className="muted members-section-subtitle">
                      Find and send a member request using their registered email address.
                    </p>

                    <form onSubmit={handleSendRequest} className="form members-inline-form">
                      <input
                        type="email"
                        name="email"
                        placeholder="Enter member email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="input"
                      />

                      <button type="submit" disabled={loading} className="btn">
                        {loading ? "Sending..." : "Send Request"}
                      </button>
                    </form>
                  </div>
                </div>

                <div className="card section-card members-stats-card">
                  <h2 className="members-section-title">Connection Summary</h2>

                  <div className="member-summary-grid members-summary-grid-large">
                    <div className="member-summary-card">
                      <p className="member-summary-label">Accepted</p>
                      <h3>{acceptedConnections.length}</h3>
                    </div>
                    <div className="member-summary-card">
                      <p className="member-summary-label">Incoming</p>
                      <h3>{incomingRequests.length}</h3>
                    </div>
                    <div className="member-summary-card">
                      <p className="member-summary-label">Outgoing</p>
                      <h3>{outgoingRequests.length}</h3>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "requests" && (
            <div className="members-tab-panel">
              <div className="members-requests-grid">
                <div className="card section-card">
                  <h2 className="members-section-title">Incoming Requests</h2>
                  <p className="muted members-section-subtitle">
                    Requests sent to you waiting for action.
                  </p>

                  {incomingRequests.length === 0 ? (
                    <div className="members-empty-state compact">
                      <h3>No incoming requests</h3>
                      <p className="muted">You're all caught up.</p>
                    </div>
                  ) : (
                    <div className="members-request-list">
                      {incomingRequests.map((request) => (
                        <div key={request.id} className="members-request-card">
                          <div className="members-request-user">
                            <div className="members-avatar">
                              {getInitials(
                                request.sender?.full_name,
                                request.sender?.email
                              )}
                            </div>

                            <div className="members-request-info">
                              <h3>{request.sender?.full_name || "No name"}</h3>
                              <p>{request.sender?.email}</p>
                            </div>
                          </div>

                          <div className="member-actions">
                            <button
                              type="button"
                              className="btn"
                              onClick={() => handleUpdateRequest(request.id, "accepted")}
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => handleUpdateRequest(request.id, "rejected")}
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="card section-card">
                  <h2 className="members-section-title">Outgoing Requests</h2>
                  <p className="muted members-section-subtitle">
                    Requests you have already sent.
                  </p>

                  {outgoingRequests.length === 0 ? (
                    <div className="members-empty-state compact">
                      <h3>No outgoing requests</h3>
                      <p className="muted">Pending requests will appear here.</p>
                    </div>
                  ) : (
                    <div className="members-request-list">
                      {outgoingRequests.map((request) => (
                        <div key={request.id} className="members-request-card">
                          <div className="members-request-user">
                            <div className="members-avatar">
                              {getInitials(
                                request.receiver?.full_name,
                                request.receiver?.email
                              )}
                            </div>

                            <div className="members-request-info">
                              <h3>{request.receiver?.full_name || "No name"}</h3>
                              <p>{request.receiver?.email}</p>
                            </div>
                          </div>

                          <div className="member-actions">
                            <button
                              type="button"
                              className="btn btn-danger"
                              onClick={() => handleDeleteRequest(request.id)}
                            >
                              Cancel Request
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

export default MembersPage;