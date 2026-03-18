import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import AppLayout from "../components/AppLayout";

function MembersPage() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [requests, setRequests] = useState([]);
  const [formData, setFormData] = useState({
    email: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

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

  return (
    <AppLayout>
      <div className="app-page">
        <div className="app-shell">
          <div className="top-bar">
            <div>
              <h1 className="page-title">Members</h1>
              <p className="page-subtitle">
                Send requests, manage invitations, and view accepted members.
              </p>
            </div>
          </div>

          <div className="two-col-grid">
            <div className="card section-card">
              <h2>Send Member Request</h2>

              <form onSubmit={handleSendRequest} className="form">
                <input
                  type="email"
                  name="email"
                  placeholder="Member Email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="input"
                />

                <button type="submit" disabled={loading} className="btn">
                  {loading ? "Sending..." : "Send Request"}
                </button>
              </form>

              {message && <p className="message">{message}</p>}
            </div>

            <div className="card section-card">
              <h2>Search Accepted Members</h2>

              <input
                type="text"
                placeholder="Search by name or email"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input"
              />

              <div className="member-summary-grid">
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

          <div className="three-col-grid">
            <div className="card section-card">
              <h2>Incoming Requests</h2>

              {incomingRequests.length === 0 ? (
                <p className="muted">No incoming requests.</p>
              ) : (
                <div className="member-list">
                  {incomingRequests.map((request) => (
                    <div key={request.id} className="member-item">
                      <p>
                        <strong>Name:</strong> {request.sender?.full_name || "No name"}
                      </p>
                      <p>
                        <strong>Email:</strong> {request.sender?.email}
                      </p>
                      <p>
                        <strong>Status:</strong> {request.status}
                      </p>

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
              <h2>Accepted Members</h2>

              {filteredAcceptedConnections.length === 0 ? (
                <p className="muted">No accepted members yet.</p>
              ) : (
                <div className="member-list">
                  {filteredAcceptedConnections.map((connection) => (
                    <div key={connection.id} className="member-item">
                      <p>
                        <strong>Name:</strong> {connection.otherUser?.full_name || "No name"}
                      </p>
                      <p>
                        <strong>Email:</strong> {connection.otherUser?.email}
                      </p>
                      <p>
                        <strong>Status:</strong> accepted
                      </p>

                      <div className="member-actions">
                        <button
                          type="button"
                          className="btn btn-danger"
                          onClick={() => handleDeleteRequest(connection.id)}
                        >
                          Remove Connection
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card section-card">
              <h2>Outgoing Requests</h2>

              {outgoingRequests.length === 0 ? (
                <p className="muted">No outgoing requests.</p>
              ) : (
                <div className="member-list">
                  {outgoingRequests.map((request) => (
                    <div key={request.id} className="member-item">
                      <p>
                        <strong>Name:</strong> {request.receiver?.full_name || "No name"}
                      </p>
                      <p>
                        <strong>Email:</strong> {request.receiver?.email}
                      </p>
                      <p>
                        <strong>Status:</strong> {request.status}
                      </p>

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
      </div>
    </AppLayout>
  );
}

export default MembersPage;