import { useState, useEffect, useMemo } from "react";
import { videoApi } from "../../utils/api";
import type { Video } from "../../utils/types";
import LoadingSpinner from "../../components/LoadingSpinner";
import Pagination from "../../components/Pagination";
import "./DashboardPage.css";

type FormData = {
  title?: string;
  videoFile?: File;
};

const ITEMS_PER_PAGE = 12;

export default function VideoAdminPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({});
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const response = await videoApi.getAll();
      if (response.success && response.data) {
        setVideos(response.data);
      }
    } catch (error) {
      console.error("Error fetching videos:", error);
    }
    setLoading(false);
  };

  const openCreateModal = () => {
    setModalMode("create");
    setEditingId(null);
    setFormData({});
    setUploadProgress("");
    setShowModal(true);
  };

  const openEditModal = (video: Video) => {
    setModalMode("edit");
    setEditingId(video._id);
    setFormData({
      title: video.title,
    });
    setUploadProgress("");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setUploadProgress("Đang chuẩn bị...");

    try {
      const uploadFormData = new FormData();
      uploadFormData.append("title", formData.title!);

      // Add file if selected
      if (formData.videoFile) {
        setUploadProgress(`Đang upload video: ${formData.videoFile.name}...`);
        uploadFormData.append("file", formData.videoFile);
      } else if (modalMode === "create") {
        alert("Vui lòng chọn 1 file video!");
        setSubmitting(false);
        setUploadProgress("");
        return;
      }

      const API_URL =
        import.meta.env.VITE_API_URL || "http://localhost:5000/api";

      if (modalMode === "create") {
        setUploadProgress("Đang upload lên Mega...");
        const response = await fetch(`${API_URL}/videos/upload`, {
          method: "POST",
          body: uploadFormData,
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.message || "Upload failed");
        }
      } else {
        // Edit mode - use PUT
        if (formData.videoFile) {
          setUploadProgress("Đang upload video mới lên Mega...");
        } else {
          setUploadProgress("Đang cập nhật...");
        }

        const response = await fetch(`${API_URL}/videos/upload/${editingId}`, {
          method: "PUT",
          body: uploadFormData,
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.message || "Update failed");
        }
      }

      setUploadProgress("Hoàn tất!");
      setShowModal(false);
      fetchVideos();
    } catch (error: any) {
      console.error("Error:", error);
      alert(`Có lỗi xảy ra: ${error.message}`);
    }
    setSubmitting(false);
    setUploadProgress("");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa video này?")) return;

    try {
      await videoApi.delete(id);
      fetchVideos();
    } catch (error) {
      console.error("Error deleting:", error);
      alert("Có lỗi xảy ra khi xóa!");
    }
  };

  // Pagination
  const totalPages = Math.ceil(videos.length / ITEMS_PER_PAGE);
  const paginatedVideos = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return videos.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [videos, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading) {
    return (
      <div className="page-loading">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1 className="page-title">
          <i className="fas fa-video"></i> Quản lý Video
        </h1>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <i className="fas fa-plus"></i> Thêm Video
        </button>
      </div>

      <div className="content-section">
        <div className="section-header">
          <h2 className="section-title">Danh sách Video ({videos.length})</h2>
        </div>

        {videos.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-video"></i>
            <p>Chưa có video nào</p>
          </div>
        ) : (
          <>
            <div className="items-grid">
              {paginatedVideos.map((video) => (
                <div key={video._id} className="item-card video">
                  <div className="item-thumbnail">
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      onError={(e) => {
                        e.currentTarget.src = `https://picsum.photos/400/225?random=${video._id}`;
                      }}
                    />
                    <div className="play-overlay">
                      <i className="fas fa-play"></i>
                    </div>
                  </div>
                  <div className="item-info">
                    <h3 className="item-title">{video.title}</h3>
                    <div className="item-actions">
                      <button
                        className="btn-icon edit"
                        onClick={() => openEditModal(video)}
                        title="Chỉnh sửa"
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button
                        className="btn-icon delete"
                        onClick={() => handleDelete(video._id)}
                        title="Xóa"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="modal-header">
              <div className="modal-header-content">
                <div
                  className={`modal-icon ${
                    modalMode === "create" ? "create video" : "edit video"
                  }`}
                >
                  <i
                    className={`fas ${
                      modalMode === "create" ? "fa-plus" : "fa-edit"
                    }`}
                  ></i>
                </div>
                <div className="modal-title-group">
                  <h3 className="modal-title">
                    {modalMode === "create"
                      ? "Thêm Video Mới"
                      : "Chỉnh Sửa Video"}
                  </h3>
                  <p className="modal-subtitle">
                    {modalMode === "create"
                      ? "Upload video mới lên hệ thống"
                      : "Cập nhật thông tin video"}
                  </p>
                </div>
              </div>
              <button
                className="modal-close"
                onClick={() => setShowModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="modal-body">
              {/* Form Fields */}
              <div className="form-fields">
                <div className="form-field">
                  <label className="field-label">
                    <i className="fas fa-heading"></i>
                    Tiêu đề video
                  </label>
                  <input
                    type="text"
                    className="field-input"
                    value={formData.title || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    required
                    placeholder="Nhập tiêu đề video..."
                  />
                </div>

                <div className="form-field">
                  <label className="field-label">
                    <i className="fas fa-film"></i>
                    File video
                    {modalMode === "edit" && (
                      <span className="field-optional">
                        {" "}
                        (để trống nếu không đổi)
                      </span>
                    )}
                  </label>
                  <div className="file-upload-area video">
                    <input
                      type="file"
                      id="video-file"
                      className="file-input-hidden"
                      accept="video/*"
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          videoFile: e.target.files?.[0] || undefined,
                        })
                      }
                      required={modalMode === "create"}
                    />
                    <label htmlFor="video-file" className="file-upload-label">
                      <div className="upload-icon video">
                        <i className="fas fa-video"></i>
                      </div>
                      <div className="upload-text">
                        <span className="upload-title">
                          {formData.videoFile
                            ? formData.videoFile.name
                            : "Chọn hoặc kéo thả file video"}
                        </span>
                        <span className="upload-hint">
                          MP4, WebM, MKV (tối đa 2GB)
                        </span>
                      </div>
                    </label>
                  </div>
                  <span className="field-hint">
                    <i className="fas fa-info-circle"></i>
                    Thumbnail sẽ tự động tạo từ frame đầu tiên của video
                  </span>
                </div>

                {/* Upload Progress */}
                {uploadProgress && (
                  <div className="upload-progress">
                    <div className="progress-indicator">
                      <i className="fas fa-spinner fa-spin"></i>
                      <span>{uploadProgress}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-modal cancel"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                >
                  <i className="fas fa-times"></i>
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-modal submit video"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      Đang xử lý...
                    </>
                  ) : modalMode === "create" ? (
                    <>
                      <i className="fas fa-upload"></i>
                      Upload & Tạo
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save"></i>
                      Lưu thay đổi
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
