import { useState, useEffect, useMemo } from "react";
import { comicApi } from "../../utils/api";
import type { Comic } from "../../utils/types";
import Loader from "../../components/loader.universe";
import Pagination from "../../components/Pagination";
import { useToast } from "../../components/Toast";
import "./DashboardPage.css";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Default placeholder for comics
const DEFAULT_COMIC_THUMBNAIL = "https://i.imgur.com/2wKqGBl.png";

type FormData = {
  name?: string;
  comicFiles?: FileList;
};

const ITEMS_PER_PAGE = 12;

export default function ComicAdminPage() {
  const [comics, setComics] = useState<Comic[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, _setModalMode] = useState<"create" | "edit">("create");
  const [editingId, _setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({});
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const { showToast } = useToast();

  useEffect(() => {
    fetchComics();
  }, []);

  const fetchComics = async () => {
    setLoading(true);
    try {
      const response = await comicApi.getAll();
      if (response.success && response.data) {
        setComics(response.data);
      }
    } catch (error) {
      console.error("Error fetching comics:", error);
    }
    setLoading(false);
  };

  const openCreateModal = () => {
    // Disabled - do nothing
    return;
  };

  const openEditModal = (_comic: Comic) => {
    // Disabled - do nothing
    return;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setUploadProgress("Đang chuẩn bị...");

    try {
      const uploadFormData = new FormData();
      uploadFormData.append("name", formData.name!);

      // Add files if selected
      if (formData.comicFiles && formData.comicFiles.length > 0) {
        setUploadProgress(`Đang upload ${formData.comicFiles.length} file...`);
        for (let i = 0; i < formData.comicFiles.length; i++) {
          uploadFormData.append("files", formData.comicFiles[i]);
        }
      } else if (modalMode === "create") {
        showToast("Vui lòng chọn ít nhất 1 file ảnh truyện!", "warning");
        setSubmitting(false);
        setUploadProgress("");
        return;
      }

      const API_URL =
        import.meta.env.VITE_API_URL || "http://localhost:5000/api";

      if (modalMode === "create") {
        setUploadProgress("Đang upload lên Mega...");
        const response = await fetch(`${API_URL}/comics/upload`, {
          method: "POST",
          body: uploadFormData,
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.message || "Upload failed");
        }
      } else {
        // Edit mode - use PUT
        if (formData.comicFiles && formData.comicFiles.length > 0) {
          setUploadProgress("Đang upload files mới lên Mega...");
        } else {
          setUploadProgress("Đang cập nhật...");
        }

        const response = await fetch(`${API_URL}/comics/upload/${editingId}`, {
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
      fetchComics();
    } catch (error: any) {
      console.error("Error:", error);
      showToast(`Có lỗi xảy ra: ${error.message}`, "error");
    }
    setSubmitting(false);
    setUploadProgress("");
  };

  const handleDelete = async (_id: string) => {
    // Disabled - do nothing
    return;
  };

  // Pagination
  const totalPages = Math.ceil(comics.length / ITEMS_PER_PAGE);
  const paginatedComics = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return comics.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [comics, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading) {
    return (
      <div className="page-loading">
        <Loader />
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1 className="page-title">
          <i className="fas fa-book-open"></i> Quản lý Truyện
        </h1>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <i className="fas fa-plus"></i> Thêm Truyện
        </button>
      </div>

      <div className="content-section">
        <div className="section-header">
          <h2 className="section-title">Danh sách Truyện ({comics.length})</h2>
        </div>

        {comics.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-book-open"></i>
            <p>Chưa có truyện nào</p>
          </div>
        ) : (
          <>
            <div className="items-grid">
              {paginatedComics.map((comic) => (
                <div key={comic._id} className="item-card">
                  <div className="item-thumbnail">
                    <img
                      src={`${API_BASE_URL}/comics/${comic._id}/cover`}
                      alt={comic.name}
                      onError={(e) => {
                        e.currentTarget.src = DEFAULT_COMIC_THUMBNAIL;
                      }}
                    />
                  </div>
                  <div className="item-info">
                    <h3 className="item-title">{comic.name}</h3>
                    <div className="item-actions">
                      <button
                        className="btn-icon edit"
                        onClick={() => openEditModal(comic)}
                        title="Chỉnh sửa"
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button
                        className="btn-icon delete"
                        onClick={() => handleDelete(comic._id)}
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
                    modalMode === "create" ? "create" : "edit"
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
                      ? "Thêm Truyện Mới"
                      : "Chỉnh Sửa Truyện"}
                  </h3>
                  <p className="modal-subtitle">
                    {modalMode === "create"
                      ? "Upload truyện mới lên hệ thống"
                      : "Cập nhật thông tin truyện"}
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
                    Tên truyện
                  </label>
                  <input
                    type="text"
                    className="field-input"
                    value={formData.name || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                    placeholder="Nhập tên truyện..."
                  />
                </div>

                <div className="form-field">
                  <label className="field-label">
                    <i className="fas fa-images"></i>
                    Files ảnh truyện
                    {modalMode === "edit" && (
                      <span className="field-optional">
                        {" "}
                        (để trống nếu không đổi)
                      </span>
                    )}
                  </label>
                  <div className="file-upload-area">
                    <input
                      type="file"
                      id="comic-files"
                      className="file-input-hidden"
                      multiple
                      accept="image/*"
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          comicFiles: e.target.files || undefined,
                        })
                      }
                      required={modalMode === "create"}
                    />
                    <label htmlFor="comic-files" className="file-upload-label">
                      <div className="upload-icon">
                        <i className="fas fa-cloud-upload-alt"></i>
                      </div>
                      <div className="upload-text">
                        <span className="upload-title">
                          {formData.comicFiles && formData.comicFiles.length > 0
                            ? `Đã chọn ${formData.comicFiles.length} file`
                            : "Chọn hoặc kéo thả files"}
                        </span>
                        <span className="upload-hint">
                          PNG, JPG, WebP (tối đa 100 files)
                        </span>
                      </div>
                    </label>
                  </div>
                  <span className="field-hint">
                    <i className="fas fa-info-circle"></i>
                    Ảnh bìa sẽ tự động lấy từ ảnh đầu tiên trong folder
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
                  className="btn-modal submit"
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
