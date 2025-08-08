// components/GitSync.tsx
import React, { useState } from "react";
import { ApiService } from "../services/api";
import { SyncRequest } from "../types/types";

interface GitSyncProps {
  onSyncComplete?: () => void;
}

const GitSync: React.FC<GitSyncProps> = ({ onSyncComplete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState({
    processed: 0,
    successful: 0,
    failed: 0,
  });
  const [syncData, setSyncData] = useState<SyncRequest>({
    owner: "",
    repo: "",
    batchSize: 50,
    maxConcurrency: 5,
  });

  const handleInputChange = (
    field: keyof SyncRequest,
    value: string | number
  ) => {
    setSyncData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSync = async () => {
    if (!syncData.owner || !syncData.repo) {
      alert("Please enter both owner and repository name");
      return;
    }

    setLoading(true);
    setStatus("Starting sync...");
    setProgress({ processed: 0, successful: 0, failed: 0 });

    try {
      await ApiService.syncRepository(
        syncData,
        (data) => {
          setProgress({
            processed: data.processed || 0,
            successful: data.successful || 0,
            failed: data.failed || 0,
          });
          if (data.status) {
            setStatus(data.status);
          }
        },
        (finalData) => {
          setStatus("Sync completed");
          setProgress({
            processed: finalData.totalBranches || 0,
            successful: finalData.successful || 0,
            failed: finalData.failed || 0,
          });
          alert("Sync completed successfully!");
          onSyncComplete?.();
          setIsOpen(false);
        }
      );
    } catch (error) {
      console.error("Sync failed:", error);
      alert("Sync failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        className="btn btn-sync"
        onClick={() => setIsOpen(true)}
        disabled={loading}
      >
        <i className="fas fa-sync-alt"></i>
        Git Sync
      </button>

      {isOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">
                <i className="fas fa-code-branch"></i>
                Sync Git Repository
              </h3>
              <button
                className="btn-close"
                onClick={() => setIsOpen(false)}
                disabled={loading}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="owner">Repository Owner</label>
                  <input
                    type="text"
                    id="owner"
                    value={syncData.owner}
                    onChange={(e) => handleInputChange("owner", e.target.value)}
                    placeholder="e.g., octocat"
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="repo">Repository Name</label>
                  <input
                    type="text"
                    id="repo"
                    value={syncData.repo}
                    onChange={(e) => handleInputChange("repo", e.target.value)}
                    placeholder="e.g., Hello-World"
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="batchSize">Batch Size</label>
                  <input
                    type="number"
                    id="batchSize"
                    value={syncData.batchSize}
                    onChange={(e) =>
                      handleInputChange("batchSize", parseInt(e.target.value))
                    }
                    min="1"
                    max="100"
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="maxConcurrency">Max Concurrency</label>
                  <input
                    type="number"
                    id="maxConcurrency"
                    value={syncData.maxConcurrency}
                    onChange={(e) =>
                      handleInputChange(
                        "maxConcurrency",
                        parseInt(e.target.value)
                      )
                    }
                    min="1"
                    max="10"
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="startDate">Start Date (Optional)</label>
                  <input
                    type="date"
                    id="startDate"
                    value={syncData.startDate || ""}
                    onChange={(e) =>
                      handleInputChange("startDate", e.target.value)
                    }
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="endDate">End Date (Optional)</label>
                  <input
                    type="date"
                    id="endDate"
                    value={syncData.endDate || ""}
                    onChange={(e) =>
                      handleInputChange("endDate", e.target.value)
                    }
                    disabled={loading}
                  />
                </div>
              </div>

              {loading && (
                <div className="progress-section">
                  <p>
                    <strong>Status:</strong> {status}
                  </p>
                  <p>
                    <strong>Processed:</strong> {progress.processed}
                  </p>
                  <p>
                    <strong>Successful:</strong> {progress.successful}
                  </p>
                  <p>
                    <strong>Failed:</strong> {progress.failed}
                  </p>
                  <div className="progress-bar-container">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${Math.min(
                          (progress.processed / 100) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setIsOpen(false)}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSync}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Syncing...
                  </>
                ) : (
                  <>
                    <i className="fas fa-sync-alt"></i>
                    Start Sync
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GitSync;
