import { useState, useEffect, useCallback, memo } from "react";
import { ethers } from "ethers";
import VotingSystemABI from "./config/VotingSystem.json";
import "./App.css";

const CONTRACT_ADDRESS =
  import.meta.env.VITE_CONTRACT_ADDRESS || "0xYourContractAddressHere";
const NETWORK_CONFIG = {
  chainId: "0xaa36a7",
  chainName: "Sepolia Test Network",
  rpcUrls: ["https://rpc.sepolia.org"],
  nativeCurrency: {
    name: "Sepolia ETH",
    symbol: "SEP",
    decimals: 18,
  },
};

function App() {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [provider, setProvider] = useState(null);
  const [view, setView] = useState("home");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Admin State
  const [forumTitle, setForumTitle] = useState("");
  const [candidates, setCandidates] = useState(["", ""]);
  const [createdForumId, setCreatedForumId] = useState("");
  const [adminForumId, setAdminForumId] = useState("");
  const [forumData, setForumData] = useState(null);

  // Voter State
  const [searchCode, setSearchCode] = useState("");
  const [voterForumId, setVoterForumId] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [voteReason, setVoteReason] = useState("");
  const [hasVotedStatus, setHasVotedStatus] = useState(false);

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        setError("Silakan install MetaMask terlebih dahulu!");
        return;
      }

      setLoading(true);
      setError("");

      await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await web3Provider.getSigner();
      const address = await signer.getAddress();

      const network = await web3Provider.getNetwork();
      if (Number(network.chainId) !== 11155111) {
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: NETWORK_CONFIG.chainId }],
          });
        } catch (switchError) {
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [NETWORK_CONFIG],
            });
          } else {
            throw switchError;
          }
        }
      }

      const votingContract = new ethers.Contract(
        CONTRACT_ADDRESS,
        VotingSystemABI.abi,
        signer
      );

      setProvider(web3Provider);
      setContract(votingContract);
      setAccount(address);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError(err.message || "Gagal menghubungkan wallet");
      setLoading(false);
    }
  };

  const createForum = async () => {
    if (!contract) return;

    try {
      setLoading(true);
      setError("");

      const validCandidates = candidates.filter((c) => c.trim() !== "");
      if (validCandidates.length < 2) {
        setError("Minimal 2 kandidat diperlukan");
        setLoading(false);
        return;
      }

      const tx = await contract.createVotingForum(forumTitle, validCandidates);
      const receipt = await tx.wait();

      const event = receipt.logs.find((log) => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed && parsed.name === "ForumCreated";
        } catch {
          return false;
        }
      });

      if (event) {
        const parsedEvent = contract.interface.parseLog(event);
        const forumId = parsedEvent.args[0];
        setCreatedForumId(forumId);
        setAdminForumId(forumId);
      }

      setLoading(false);
      alert("Forum voting berhasil dibuat!");
    } catch (err) {
      console.error(err);
      setError(err.message || "Gagal membuat forum");
      setLoading(false);
    }
  };

  const loadForumData = async (forumId, isAdmin = false) => {
    if (!contract) return;

    try {
      setLoading(true);
      setError("");

      const [title, admin, isActive, totalVoters] =
        await contract.getForumDetails(forumId);
      const [candidateNames, voteCounts] = await contract.getCandidates(
        forumId
      );

      const data = {
        title,
        admin,
        isActive,
        totalVoters: Number(totalVoters),
        candidates: candidateNames.map((name, i) => ({
          name,
          votes: Number(voteCounts[i]),
        })),
      };

      if (isAdmin && admin.toLowerCase() === account.toLowerCase()) {
        try {
          const [voters, choices, reasons] =
            await contract.getAllVotersWithReasons(forumId);
          data.voterData = voters.map((voter, i) => ({
            address: voter,
            choice: Number(choices[i]),
            reason: reasons[i],
          }));
        } catch (err) {
          console.log("Not admin or no voters yet");
        }
      }

      if (!isAdmin) {
        const voted = await contract.hasVoted(forumId, account);
        setHasVotedStatus(voted);
      }

      setForumData(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("Forum tidak ditemukan atau terjadi kesalahan");
      setLoading(false);
    }
  };

  const submitVote = async () => {
    if (!contract || selectedCandidate === null) return;

    try {
      setLoading(true);
      setError("");

      const tx = await contract.vote(
        voterForumId,
        selectedCandidate,
        voteReason
      );
      await tx.wait();

      alert("Suara Anda berhasil tercatat!");
      setHasVotedStatus(true);
      await loadForumData(voterForumId, false);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError(err.message || "Gagal mengirim suara");
      setLoading(false);
    }
  };

  const endVoting = async () => {
    if (!contract) return;

    try {
      setLoading(true);
      setError("");

      const tx = await contract.endVoting(adminForumId);
      await tx.wait();

      alert("Voting telah berakhir!");
      await loadForumData(adminForumId, true);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError(err.message || "Gagal mengakhiri voting");
      setLoading(false);
    }
  };

  const handleBackToHome = () => {
    setView("home");
  };

  // Memoized handlers untuk prevent re-render
  const handleTitleChange = useCallback((e) => {
    setForumTitle(e.target.value);
  }, []);

  const handleCandidateChange = useCallback((index, value) => {
    setCandidates((prev) => {
      const newCandidates = [...prev];
      newCandidates[index] = value;
      return newCandidates;
    });
  }, []);

  const handleAddCandidate = useCallback(() => {
    setCandidates((prev) => [...prev, ""]);
  }, []);

  const handleRemoveCandidate = useCallback((index) => {
    setCandidates((prev) => prev.filter((_, i) => i !== index));
  }, []);

  if (view === "home") {
    return (
      <div className="container">
        <div className="card">
          <h1>Sistem Voting</h1>
          <p className="subtitle">Blockchain Sepolia Network</p>

          {!account ? (
            <button
              onClick={connectWallet}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? "Menghubungkan..." : "Connect Wallet"}
            </button>
          ) : (
            <div>
              <div className="account-box">
                <p className="label">Terhubung sebagai:</p>
                <p className="address">{account}</p>
              </div>

              <button
                onClick={() => setView("admin")}
                className="btn btn-admin"
              >
                Masuk sebagai Admin
              </button>

              <button
                onClick={() => setView("voter")}
                className="btn btn-voter"
              >
                Masuk sebagai Voter
              </button>
            </div>
          )}

          {error && <div className="error-box">{error}</div>}
        </div>
      </div>
    );
  }

  if (view === "admin") {
    return (
      <div className="container">
        <div className="card">
          <div className="header">
            <h2>Admin Dashboard</h2>
            <button onClick={handleBackToHome} className="btn-back">
              Kembali
            </button>
          </div>

          {!createdForumId ? (
            <div className="form">
              <div className="form-group">
                <label>Judul Voting</label>
                <input
                  type="text"
                  value={forumTitle}
                  onChange={handleTitleChange}
                  placeholder="Contoh: Pemilihan Ketua Osis Periode 2025/2026"
                />
              </div>

              <div className="form-group">
                <label>Kandidat</label>
                {candidates.map((candidate, index) => (
                  <div key={index} className="candidate-input">
                    <input
                      type="text"
                      value={candidate}
                      onChange={(e) =>
                        handleCandidateChange(index, e.target.value)
                      }
                      placeholder={`Kandidat ${index + 1}`}
                    />
                    {candidates.length > 2 && (
                      <button
                        onClick={() => handleRemoveCandidate(index)}
                        className="btn-remove"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                ))}
                <button onClick={handleAddCandidate} className="btn-add">
                  + Tambah Kandidat
                </button>
              </div>

              <button
                onClick={createForum}
                disabled={loading}
                className="btn btn-primary"
              >
                {loading ? "Membuat Forum..." : "Buat Forum Voting"}
              </button>
            </div>
          ) : (
            <div>
              <div className="success-box">
                <p>Forum berhasil dibuat!</p>
                <p className="forum-code">
                  Kode Forum:
                  <br />
                  <span>{createdForumId}</span>
                </p>

                <p className="note">Bagikan kode ini kepada voter</p>
              </div>

              <button
                onClick={() => loadForumData(adminForumId, true)}
                className="btn btn-primary"
              >
                Cek Status Forum
              </button>

              {forumData && (
                <div className="results">
                  <div className="info-box">
                    <h3>{forumData.title}</h3>
                    <p>Total Voter: {forumData.totalVoters}</p>
                    <p>
                      Status: {forumData.isActive ? "🟢 Aktif" : "🔴 Selesai"}
                    </p>
                  </div>

                  <h4>Hasil Voting:</h4>
                  {forumData.candidates.map((candidate, i) => (
                    <div key={i} className="result-item">
                      <div className="result-header">
                        <span>{candidate.name}</span>
                        <span className="votes">{candidate.votes} suara</span>
                      </div>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${
                              forumData.totalVoters > 0
                                ? (candidate.votes / forumData.totalVoters) *
                                  100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}

                  {forumData.voterData && forumData.voterData.length > 0 && (
                    <div>
                      <h4>Alasan Voter:</h4>
                      {forumData.voterData.map((voter, i) => (
                        <div key={i} className="reason-box">
                          <p className="voter-address">
                            {voter.address.slice(0, 6)}...
                            {voter.address.slice(-4)}
                          </p>
                          <p className="voter-choice">
                            Memilih: {forumData.candidates[voter.choice]?.name}
                          </p>
                          <p className="voter-reason">"{voter.reason}"</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {forumData.isActive && (
                    <button
                      onClick={endVoting}
                      disabled={loading}
                      className="btn btn-danger"
                    >
                      {loading ? "Mengakhiri..." : "Akhiri Voting"}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {error && <div className="error-box">{error}</div>}
        </div>
      </div>
    );
  }

  if (view === "voter") {
    return (
      <div className="container">
        <div className="card">
          <div className="header">
            <h2>Voter</h2>
            <button
              onClick={() => {
                setView("home");
                setVoterForumId("");
                setForumData(null);
              }}
              className="btn-back"
            >
              Kembali
            </button>
          </div>

          {!voterForumId ? (
            <div className="form">
              <div className="form-group">
                <label>Masukkan Kode Forum</label>
                <input
                  type="text"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  placeholder="Paste kode forum dari admin"
                  className="forum-input"
                />
              </div>

              <button
                onClick={() => {
                  setVoterForumId(searchCode);
                  loadForumData(searchCode, false);
                }}
                disabled={!searchCode || loading}
                className="btn btn-voter"
              >
                {loading ? "Mencari..." : "Cari Forum"}
              </button>
            </div>
          ) : !forumData ? (
            <div className="loading">Memuat data forum...</div>
          ) : !forumData.isActive ? (
            <div>
              <div className="warning-box">Voting telah berakhir</div>

              <div className="info-box">
                <h3>{forumData.title}</h3>

                <h4>Hasil Voting:</h4>
                {forumData.candidates.map((candidate, i) => (
                  <div key={i} className="result-item">
                    <div className="result-header">
                      <span>{candidate.name}</span>
                      <span className="votes">{candidate.votes} suara</span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-fill-voter"
                        style={{
                          width: `${
                            forumData.totalVoters > 0
                              ? (candidate.votes / forumData.totalVoters) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                ))}

                <div className="winner-box">
                  Pemenang:{" "}
                  {
                    forumData.candidates.reduce((max, c) =>
                      c.votes > max.votes ? c : max
                    ).name
                  }
                </div>
              </div>
            </div>
          ) : hasVotedStatus ? (
            <div className="info-box">
              <h3>{forumData.title}</h3>
              <div className="success-box">
                <p>✅ Anda sudah memberikan suara</p>
                <p>Terima kasih atas partisipasi Anda!</p>
              </div>
              <p className="note">
                Silakan tunggu hingga voting berakhir untuk melihat hasil.
              </p>
            </div>
          ) : (
            <div>
              <div className="info-box">
                <h3>{forumData.title}</h3>
                <p>Suara kecilmu punya dampak besar. Ayo vote!</p>
              </div>

              <div className="form-group">
                <label>Pilih Kandidat:</label>
                {forumData.candidates.map((candidate, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedCandidate(i)}
                    className={`candidate-btn ${
                      selectedCandidate === i ? "selected" : ""
                    }`}
                  >
                    {candidate.name}
                  </button>
                ))}
              </div>

              <div className="form-group">
                <label>Alasan memilih:</label>
                <textarea
                  value={voteReason}
                  onChange={(e) => setVoteReason(e.target.value)}
                  placeholder="Tulis alasan Anda memilih kandidat ini..."
                  rows="4"
                />
              </div>

              <button
                onClick={submitVote}
                disabled={
                  selectedCandidate === null || !voteReason.trim() || loading
                }
                className="btn btn-voter"
              >
                {loading ? "Mengirim..." : "Kirim Suara"}
              </button>
            </div>
          )}

          {error && <div className="error-box">{error}</div>}
        </div>
      </div>
    );
  }

  return null;
}

export default App;
