import { getErrorMessage } from '../../lib/errors';
import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles, Send, Save, RefreshCw, Image as ImageIcon, Upload,
  CheckCircle2, Clock, AlertCircle, XCircle, ChevronRight, ChevronDown,
  ThumbsUp, MessageSquare, Share2, Globe, AlertTriangle, Eye, BarChart3
} from 'lucide-react';
import api from '../../services/api';
import { fetchFormDataWithToken } from '../../services/authService';

interface Product {
  id: string;
  name: string;
  sku: string;
  standardListedPrice: number;
  unit: string;
  imageUrl?: string;
  description?: string;
}

interface MarketingPost {
  id: string;
  code: string;
  productId: string;
  productName: string;
  productSku: string;
  productPrice: number;
  productUnit: string;
  status: string;
  promptUsed: string;
  selectedImageUrl: string;
  editedCaption: string;
  hashtags?: string;
  ctaText?: string;
  rejectionReason?: string;
  scheduledTime?: string;
  externalPostId?: string;
  createdAt: string;
}

interface MarketingPostMetrics {
  postId: string;
  status: string;
  externalPostId?: string;
  reachCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  lastSyncedAt?: string;
}

interface FormErrors {
  productId?: string;
  prompt?: string;
  caption?: string;
  imageUrl?: string;
  hashtags?: string;
  cta?: string;
  general?: string;
}

const STATUS_MAP: Record<string, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  Draft: { label: 'Bản nháp', bg: 'bg-gray-100', text: 'text-gray-700', icon: <Clock className="w-3 h-3" /> },
  Submitted: { label: 'Chờ duyệt', bg: 'bg-blue-50', text: 'text-blue-700', icon: <Send className="w-3 h-3" /> },
  Approved: { label: 'Đã duyệt', bg: 'bg-indigo-50', text: 'text-indigo-700', icon: <CheckCircle2 className="w-3 h-3" /> },
  Scheduled: { label: 'Đã lên lịch', bg: 'bg-indigo-50', text: 'text-indigo-700', icon: <Clock className="w-3 h-3" /> },
  Posting: { label: 'Đang đăng', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: <RefreshCw className="w-3 h-3 animate-spin" /> },
  Success: { label: 'Đã đăng FB', bg: 'bg-emerald-100', text: 'text-emerald-800', icon: <CheckCircle2 className="w-3 h-3" /> },
  ReworkRequired: { label: 'Cần sửa lại', bg: 'bg-amber-50', text: 'text-amber-700', icon: <AlertCircle className="w-3 h-3" /> },
  Rejected: { label: 'Từ chối', bg: 'bg-rose-50', text: 'text-rose-700', icon: <XCircle className="w-3 h-3" /> },
  PublishFailed: { label: 'Lỗi đăng bài', bg: 'bg-rose-100', text: 'text-rose-800', icon: <XCircle className="w-3 h-3" /> },
};

const URL_REGEX = /^https?:\/\/.+/i;

export default function SalesAiContentStudio() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [templateName, setTemplateName] = useState<string>('Khuyến mãi hot');
  const [tone, setTone] = useState<string>('Hào hứng');
  const [prompt, setPrompt] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const [editedCaption, setEditedCaption] = useState('');
  const [editedImageUrl, setEditedImageUrl] = useState('');
  const [editedHashtags, setEditedHashtags] = useState('');
  const [editedCta, setEditedCta] = useState('');
  const [currentPostId, setCurrentPostId] = useState<string | null>(null);
  const [currentPostStatus, setCurrentPostStatus] = useState<string>('Draft');
  const [myPosts, setMyPosts] = useState<MarketingPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [expandedMetricsPostId, setExpandedMetricsPostId] = useState<string | null>(null);
  const [metricsByPostId, setMetricsByPostId] = useState<Record<string, MarketingPostMetrics>>({});
  const [loadingMetricsPostId, setLoadingMetricsPostId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generatingSingleImage, setGeneratingSingleImage] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [imgLoading, setImgLoading] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (editedImageUrl) {
      setImgLoading(true);
      setImgError(false);
    } else {
      setImgLoading(false);
      setImgError(false);
    }
  }, [editedImageUrl]);

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await api.get('/products?pageSize=100');
      const raw = res.data;
      const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.items) ? raw.items : (Array.isArray(raw?.data) ? raw.data : []));
      setProducts(list);
      if (list.length > 0) setSelectedProductId(list[0].id);
    } catch (err) { console.error('Failed to fetch products:', err); }
    finally { setLoadingProducts(false); }
  };

  const fetchMyPosts = async () => {
    setLoadingPosts(true);
    try {
      const res = await api.get('/marketing-posts');
      setMyPosts(Array.isArray(res.data) ? res.data : []);
    } catch (err) { console.error('Failed to fetch posts:', err); }
    finally { setLoadingPosts(false); }
  };

  useEffect(() => { fetchProducts(); fetchMyPosts(); }, []);

  // Validation logic
  const validateForm = (isSubmitting: boolean = false): boolean => {
    const errs: FormErrors = {};

    if (!selectedProductId) {
      errs.productId = 'Vui lòng chọn sản phẩm cần tạo bài viết.';
    }

    if (prompt && prompt.length > 500) {
      errs.prompt = 'Yêu cầu bổ sung không được vượt quá 500 ký tự.';
    }

    if (!editedCaption.trim()) {
      errs.caption = 'Nội dung bài viết (Caption) không được để trống.';
    } else if (editedCaption.trim().length < 10) {
      errs.caption = 'Nội dung bài viết quá ngắn (tối thiểu 10 ký tự).';
    } else if (editedCaption.length > 2000) {
      errs.caption = 'Nội dung bài viết vượt quá giới hạn 2000 ký tự.';
    }

    if (isSubmitting && !editedImageUrl.trim()) {
      errs.imageUrl = 'Bài đăng Facebook bắt buộc phải có hình ảnh. Vui lòng bấm "Sinh ảnh AI" hoặc chọn "Ảnh gốc".';
    } else if (editedImageUrl.trim() && !URL_REGEX.test(editedImageUrl.trim())) {
      errs.imageUrl = 'Đường dẫn hình ảnh không hợp lệ (phải bắt đầu bằng http:// hoặc https://).';
    }

    if (editedHashtags && editedHashtags.length > 200) {
      errs.hashtags = 'Hashtags không được vượt quá 200 ký tự.';
    }

    if (editedCta && editedCta.length > 100) {
      errs.cta = 'Nút kêu gọi hành động (CTA) không được vượt quá 100 ký tự.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleGenerateSingleImage = async () => {
    if (!selectedProductId) {
      setErrors(prev => ({ ...prev, productId: 'Vui lòng chọn sản phẩm trước khi sinh ảnh!' }));
      return;
    }
    setErrors(prev => ({ ...prev, imageUrl: undefined }));
    const selectedProd = products.find(p => p.id === selectedProductId);
    const prodDetails = selectedProd ? `${selectedProd.name} ${selectedProd.description || ''} bao bì đóng gói` : 'Vật tư đóng gói bao bì Việt Tiến';
    const imgPrompt = prompt.trim() ? `${prodDetails}, ${prompt.trim()}` : prodDetails;

    setGeneratingSingleImage(true);
    try {
      const res = await api.post('/marketing-posts/generate-image', { prompt: imgPrompt });
      if (res.data?.imageUrl) {
        setEditedImageUrl(res.data.imageUrl);
      }
    } catch (err: unknown) {
      alert('Sinh ảnh AI thất bại: ' + (getErrorMessage(err)));
    } finally {
      setGeneratingSingleImage(false);
    }
  };

  const handleUploadImage = async (file: File) => {
    if (!selectedProductId) {
      setErrors(prev => ({ ...prev, productId: 'Vui lòng chọn sản phẩm trước khi tải ảnh lên.' }));
      return;
    }

    setUploadingImage(true);
    try {
      // POST /marketing-posts/{id}/media cần bài đã tồn tại — nếu chưa lưu nháp lần nào thì tự tạo
      // nháp trước (giống hành vi handleSavePost với submitImmediately=false) để có id để upload vào.
      let postId = currentPostId;
      if (!postId) {
        const created = await api.post('/marketing-posts', {
          productId: selectedProductId,
          promptUsed: prompt || `Template: ${templateName}, Tone: ${tone}`,
          templateName,
          tone,
          generatedImageUrl: editedImageUrl,
          generatedCaption: editedCaption,
          selectedImageUrl: editedImageUrl,
          editedCaption,
          hashtags: editedHashtags,
          ctaText: editedCta,
          submitImmediately: false
        });
        postId = created.data.id;
        setCurrentPostId(postId);
        setCurrentPostStatus('Draft');
      }

      const formData = new FormData();
      formData.append('file', file);
      const updated = await fetchFormDataWithToken('POST', `/marketing-posts/${postId}/media`, formData);

      if (updated?.selectedImageUrl) {
        setEditedImageUrl(updated.selectedImageUrl);
        if (errors.imageUrl) setErrors(prev => ({ ...prev, imageUrl: undefined }));
      }
      fetchMyPosts();
    } catch (err: unknown) {
      alert('Tải ảnh lên thất bại: ' + getErrorMessage(err));
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleGenerateAi = async () => {
    if (!selectedProductId) {
      setErrors(prev => ({ ...prev, productId: 'Vui lòng chọn sản phẩm cần tạo bài viết.' }));
      return;
    }
    if (prompt && prompt.length > 500) {
      setErrors(prev => ({ ...prev, prompt: 'Yêu cầu bổ sung không được vượt quá 500 ký tự.' }));
      return;
    }

    setGenerating(true);
    setErrors({});
    try {
      const res = await api.post('/marketing-posts/generate-options', {
        productId: selectedProductId, prompt, templateName, tone
      });
      const options = res.data?.options || [];
      if (options.length > 0) {
        const bestOpt = options[0];
        setEditedCaption(bestOpt.caption || '');
        setEditedImageUrl(bestOpt.imageUrl || '');
        setEditedHashtags(bestOpt.hashtags || '');
        setEditedCta(bestOpt.ctaText || '');
        setCurrentPostId(null);
        setCurrentPostStatus('Draft');
      }
    } catch (err: unknown) {
      alert('Tạo nội dung AI thất bại: ' + (getErrorMessage(err)));
    } finally { setGenerating(false); }
  };

  const handleSavePost = async (submitImmediately: boolean = false) => {
    if (!validateForm(submitImmediately)) return;

    if (submitImmediately) setSubmitting(true); else setSaving(true);
    try {
      if (currentPostId) {
        await api.put(`/marketing-posts/${currentPostId}`, {
          selectedImageUrl: editedImageUrl,
          editedCaption,
          hashtags: editedHashtags,
          ctaText: editedCta,
          submitImmediately
        });
        alert(submitImmediately ? 'Đã gửi bài viết cho Sales Manager duyệt thành công!' : 'Đã lưu bài viết nháp thành công!');
      } else {
        const res = await api.post('/marketing-posts', {
          productId: selectedProductId,
          promptUsed: prompt || `Template: ${templateName}, Tone: ${tone}`,
          templateName,
          tone,
          generatedImageUrl: editedImageUrl,
          generatedCaption: editedCaption,
          selectedImageUrl: editedImageUrl,
          editedCaption,
          hashtags: editedHashtags,
          ctaText: editedCta,
          submitImmediately
        });
        setCurrentPostId(res.data.id);
        setCurrentPostStatus(submitImmediately ? 'Submitted' : 'Draft');
        alert(submitImmediately ? 'Đã tạo và gửi duyệt bài viết thành công!' : 'Đã lưu bài viết nháp thành công!');
      }
      fetchMyPosts();
    } catch (err: unknown) {
      alert('Lỗi: ' + (getErrorMessage(err)));
    } finally {
      setSaving(false);
      setSubmitting(false);
    }
  };

  const toggleMetrics = async (postId: string) => {
    if (expandedMetricsPostId === postId) {
      setExpandedMetricsPostId(null);
      return;
    }
    setExpandedMetricsPostId(postId);
    if (metricsByPostId[postId]) return; // đã tải trước đó, không gọi lại

    setLoadingMetricsPostId(postId);
    try {
      const res = await api.get(`/marketing-posts/${postId}/metrics`);
      setMetricsByPostId(prev => ({ ...prev, [postId]: res.data }));
    } catch (err: unknown) {
      alert('Không tải được chỉ số bài đăng: ' + getErrorMessage(err));
      setExpandedMetricsPostId(null);
    } finally {
      setLoadingMetricsPostId(null);
    }
  };

  const loadPostToEdit = (post: MarketingPost) => {
    setCurrentPostId(post.id);
    setSelectedProductId(post.productId);
    setEditedCaption(post.editedCaption || '');
    setEditedImageUrl(post.selectedImageUrl || '');
    setEditedHashtags(post.hashtags || '');
    setEditedCta(post.ctaText || '');
    setCurrentPostStatus(post.status);
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredPosts = myPosts.filter(p => statusFilter === 'ALL' || p.status === statusFilter);
  const selectedProduct = products.find(p => p.id === selectedProductId);
  const statusCfg = STATUS_MAP[currentPostStatus] || STATUS_MAP.Draft;

  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 px-5 py-4 flex-shrink-0">
        <div className="flex items-center gap-1.5 text-[11px] mb-0.5">
          <span className="text-gray-400">Bán hàng</span>
          <span className="text-gray-300">/</span>
          <span className="text-gray-800 font-semibold">AI Content Studio</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Tạo Bài Đăng Facebook Marketing</h2>
            <p className="text-xs text-gray-500 mt-0.5">Sử dụng AI để tạo nội dung quảng cáo từ dữ liệu sản phẩm, chỉnh sửa và gửi duyệt</p>
          </div>
          <button
            onClick={fetchMyPosts}
            className="h-8 px-3 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingPosts ? 'animate-spin' : ''}`} /> Làm mới
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-gray-50 p-5">
        {/* Validation Alert Banner - Only render when there are active non-empty error strings */}
        {(() => {
          const activeErrors = Object.entries(errors)
            .filter(([_, msg]) => typeof msg === 'string' && msg.trim().length > 0)
            .map(([k, msg]) => ({ key: k, text: msg! }));
          if (activeErrors.length === 0) return null;
          return (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-xs text-rose-800 animate-fadeIn">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Vui lòng kiểm tra lại thông tin:</div>
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px]">
                  {activeErrors.map(err => (
                    <li key={err.key}>{err.text}</li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })()}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* LEFT: Generator Config */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-lg border border-gray-200 shadow-xs overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-slate-50">
                <h3 className="text-xs font-bold text-gray-800 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  Bước 1 — Thiết lập & Tạo nội dung AI
                </h3>
              </div>
              <div className="p-4 space-y-3">
                {/* Product selector */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                    Sản phẩm <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedProductId}
                    onChange={e => {
                      setSelectedProductId(e.target.value);
                      if (errors.productId) setErrors(prev => ({ ...prev, productId: undefined }));
                    }}
                    className={`w-full text-xs border rounded-md px-3 py-2 bg-white focus:ring-1 transition-colors ${errors.productId ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/20' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                      }`}
                    disabled={loadingProducts}
                  >
                    <option value="">-- Chọn sản phẩm --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>[{p.sku}] {p.name} — {p.standardListedPrice?.toLocaleString()}đ/{p.unit}</option>
                    ))}
                  </select>
                  {errors.productId && (
                    <p className="mt-1 text-[11px] text-rose-600 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" /> {errors.productId}
                    </p>
                  )}
                  {selectedProduct && (
                    <div className="mt-1.5 p-2 rounded bg-slate-50 border border-gray-100 text-[11px] text-gray-600 flex items-center justify-between">
                      <span>Mã: <b className="font-mono text-gray-800">{selectedProduct.sku}</b></span>
                      <span>Giá niêm yết: <b className="text-blue-700">{selectedProduct.standardListedPrice?.toLocaleString()} đ/{selectedProduct.unit}</b></span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">Chủ đề bài đăng</label>
                    <select value={templateName} onChange={e => setTemplateName(e.target.value)} className="w-full text-xs border border-gray-300 rounded-md px-3 py-2 bg-white">
                      <option value="Khuyến mãi hot">Khuyến mãi hấp dẫn</option>
                      <option value="Bán hàng B2B">Giới thiệu B2B</option>
                      <option value="Ra mắt sản phẩm">Ra mắt sản phẩm</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">Giọng văn</label>
                    <select value={tone} onChange={e => setTone(e.target.value)} className="w-full text-xs border border-gray-300 rounded-md px-3 py-2 bg-white">
                      <option value="Hào hứng">Hào hứng, kích cầu</option>
                      <option value="Chuyên nghiệp">Chuyên nghiệp, B2B</option>
                      <option value="Thân thiện">Thân thiện, tư vấn</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold text-gray-600">Yêu cầu bổ sung (Prompt)</label>
                    <span className={`text-[10px] ${prompt.length > 500 ? 'text-rose-600 font-bold' : 'text-gray-400'}`}>
                      {prompt.length}/500
                    </span>
                  </div>
                  <textarea
                    value={prompt}
                    onChange={e => {
                      setPrompt(e.target.value);
                      if (errors.prompt && e.target.value.length <= 500) setErrors(prev => ({ ...prev, prompt: undefined }));
                    }}
                    maxLength={500}
                    rows={3}
                    placeholder="VD: Nhấn mạnh chiết khấu sỉ 15% cho đơn từ 10 cây, miễn phí giao hàng nội thành..."
                    className={`w-full text-xs border rounded-md p-2.5 bg-white focus:ring-1 transition-colors ${errors.prompt ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/20' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                      }`}
                  />
                  {errors.prompt && (
                    <p className="mt-1 text-[11px] text-rose-600 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" /> {errors.prompt}
                    </p>
                  )}
                </div>

                <button
                  onClick={handleGenerateAi}
                  disabled={generating || !selectedProductId}
                  className="w-full py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-colors shadow-xs"
                >
                  {generating
                    ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> AI đang viết bài...</>
                    : <><Sparkles className="w-3.5 h-3.5" /> Tạo bài viết với AI</>
                  }
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: Editor + FB Preview */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white rounded-lg border border-gray-200 shadow-xs overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-slate-50 flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-800 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-600" />
                  Bước 2 — Chỉnh sửa & Xem trước bài đăng
                </h3>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${statusCfg.bg} ${statusCfg.text}`}>
                  {statusCfg.icon} {statusCfg.label}
                </span>
              </div>

              <div className="p-4 space-y-3">
                {/* Caption input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold text-gray-600">
                      Nội dung Caption <span className="text-rose-500">*</span>
                    </label>
                    <span className={`text-[10px] ${editedCaption.length > 2000 ? 'text-rose-600 font-bold' : editedCaption.length < 10 && editedCaption.length > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                      {editedCaption.length}/2000 ký tự
                    </span>
                  </div>
                  <textarea
                    value={editedCaption}
                    onChange={e => {
                      setEditedCaption(e.target.value);
                      if (errors.caption) setErrors(prev => ({ ...prev, caption: undefined }));
                    }}
                    rows={6}
                    maxLength={2000}
                    className={`w-full text-xs border rounded-md p-3 leading-relaxed focus:ring-1 transition-colors ${errors.caption ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/20' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                      }`}
                    placeholder="Bấm 'Tạo bài viết với AI' ở bước 1 hoặc tự nhập nội dung bài đăng Facebook tại đây..."
                  />
                  {errors.caption && (
                    <p className="mt-1 text-[11px] text-rose-600 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" /> {errors.caption}
                    </p>
                  )}
                </div>

                {/* Hashtags and CTA */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-semibold text-gray-600">Hashtags</label>
                      <span className="text-[10px] text-gray-400">{editedHashtags.length}/200</span>
                    </div>
                    <input
                      type="text"
                      value={editedHashtags}
                      maxLength={200}
                      onChange={e => {
                        setEditedHashtags(e.target.value);
                        if (errors.hashtags) setErrors(prev => ({ ...prev, hashtags: undefined }));
                      }}
                      className={`w-full text-xs border rounded-md py-2 px-3 focus:ring-1 ${errors.hashtags ? 'border-rose-400 focus:ring-rose-500' : 'border-gray-300 focus:ring-blue-500'
                        }`}
                      placeholder="#VietTien #BaoBi #DongGoi"
                    />
                    {errors.hashtags && (
                      <p className="mt-1 text-[11px] text-rose-600 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3 h-3 flex-shrink-0" /> {errors.hashtags}
                      </p>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-semibold text-gray-600">Nút kêu gọi hành động (CTA)</label>
                      <span className="text-[10px] text-gray-400">{editedCta.length}/100</span>
                    </div>
                    <input
                      type="text"
                      value={editedCta}
                      maxLength={100}
                      onChange={e => {
                        setEditedCta(e.target.value);
                        if (errors.cta) setErrors(prev => ({ ...prev, cta: undefined }));
                      }}
                      className={`w-full text-xs border rounded-md py-2 px-3 focus:ring-1 ${errors.cta ? 'border-rose-400 focus:ring-rose-500' : 'border-gray-300 focus:ring-blue-500'
                        }`}
                      placeholder="📩 Nhắn tin ngay để báo giá sỉ!"
                    />
                    {errors.cta && (
                      <p className="mt-1 text-[11px] text-rose-600 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3 h-3 flex-shrink-0" /> {errors.cta}
                      </p>
                    )}
                  </div>
                </div>

                {/* Image URL with Generate AI Image button */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                    Hình ảnh bài viết <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editedImageUrl}
                      onChange={e => {
                        setEditedImageUrl(e.target.value);
                        if (errors.imageUrl) setErrors(prev => ({ ...prev, imageUrl: undefined }));
                      }}
                      className={`flex-1 text-xs border rounded-md py-2 px-3 font-mono focus:ring-1 ${errors.imageUrl ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/20' : 'border-gray-300 focus:ring-blue-500'
                        }`}
                      placeholder="https://..."
                    />
                    {selectedProduct?.imageUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditedImageUrl(selectedProduct.imageUrl!);
                          if (errors.imageUrl) setErrors(prev => ({ ...prev, imageUrl: undefined }));
                        }}
                        className="py-2 px-3 rounded-md text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 flex items-center gap-1 transition-colors whitespace-nowrap"
                        title="Dùng ảnh gốc sản phẩm"
                      >
                        <ImageIcon className="w-3.5 h-3.5" /> Ảnh gốc
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={generatingSingleImage || !selectedProductId}
                      onClick={handleGenerateSingleImage}
                      className="py-2 px-3 rounded-md text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      {generatingSingleImage ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-amber-300" />}
                      <span>{generatingSingleImage ? 'Đang tạo...' : 'Sinh ảnh AI'}</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadImage(file);
                      }}
                    />
                    <button
                      type="button"
                      disabled={uploadingImage || !selectedProductId}
                      onClick={() => fileInputRef.current?.click()}
                      className="py-2 px-3 rounded-md text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 whitespace-nowrap"
                      title="Tải ảnh của riêng bạn lên (JPG/PNG/WEBP, tối đa 10MB)"
                    >
                      {uploadingImage ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      <span>{uploadingImage ? 'Đang tải...' : 'Tải ảnh lên'}</span>
                    </button>
                  </div>
                  {errors.imageUrl && (
                    <p className="mt-1 text-[11px] text-rose-600 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" /> {errors.imageUrl}
                    </p>
                  )}
                </div>
              </div>

              {/* Facebook Post Mockup Preview */}
              <div className="mx-4 mb-4 border border-gray-200 rounded-lg bg-white overflow-hidden shadow-xs">
                <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-[11px] text-gray-500 font-medium">
                  <span className="flex items-center gap-1 text-blue-700 font-semibold">
                    <Globe className="w-3 h-3" /> Xem trước hiển thị trên Facebook Page
                  </span>
                  <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold">MOCKUP</span>
                </div>
                <div className="p-3.5 space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-blue-900 text-white font-bold text-[10px] flex items-center justify-center shadow-xs">VT</div>
                    <div>
                      <h4 className="text-[11px] font-bold text-gray-900 leading-tight">Công Ty Sản Xuất Bao Bì Việt Tiến</h4>
                      <p className="text-[10px] text-gray-400 flex items-center gap-1">Vừa xong · <Globe className="w-2.5 h-2.5" /></p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-800 whitespace-pre-line leading-relaxed">
                    {editedCaption || <span className="text-gray-400 italic">Nội dung bài viết sẽ hiển thị tại đây...</span>}
                  </div>
                  {editedHashtags && <div className="text-xs font-semibold text-blue-600">{editedHashtags}</div>}
                  {editedCta && <div className="p-2 rounded-md bg-blue-50 border border-blue-100 text-xs font-semibold text-blue-800 text-center">{editedCta}</div>}
                  {editedImageUrl && (
                    <div className="rounded-md overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center min-h-[160px] relative">
                      {imgLoading && (
                        <div className="flex flex-col items-center justify-center p-6 text-gray-500 text-xs">
                          <RefreshCw className="w-5 h-5 animate-spin text-blue-600 mb-2" />
                          <span>Đang tải hình ảnh AI...</span>
                        </div>
                      )}
                      {imgError ? (
                        <div className="flex flex-col items-center justify-center p-6 text-center text-xs text-rose-600 bg-rose-50/50 w-full">
                          <AlertCircle className="w-6 h-6 text-rose-500 mb-1" />
                          <span className="font-semibold">Không thể tải hình ảnh từ URL</span>
                          <span className="text-[11px] text-gray-500 mt-1">Đang chờ hình ảnh AI khởi tạo hoặc URL ảnh không phản hồi. Vui lòng bấm "Sinh ảnh AI" lại hoặc chọn "Ảnh gốc".</span>
                        </div>
                      ) : (
                        <img
                          src={editedImageUrl}
                          alt="Preview"
                          onLoad={() => setImgLoading(false)}
                          onError={() => { setImgLoading(false); setImgError(true); }}
                          className={`w-full max-h-80 object-contain rounded-md transition-opacity duration-200 ${imgLoading ? 'hidden' : 'block'}`}
                        />
                      )}
                    </div>
                  )}
                  <div className="pt-2 border-t border-gray-100 flex items-center justify-around text-gray-400 text-[11px] font-medium">
                    <span className="flex items-center gap-1"><ThumbsUp className="w-3.5 h-3.5" /> Thích</span>
                    <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> Bình luận</span>
                    <span className="flex items-center gap-1"><Share2 className="w-3.5 h-3.5" /> Chia sẻ</span>
                  </div>
                </div>
              </div>

              {/* Save / Submit Buttons */}
              <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-2">
                <button
                  onClick={() => handleSavePost(false)}
                  disabled={saving || submitting}
                  className="py-2 px-4 rounded-lg text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 flex items-center gap-1.5 disabled:opacity-50 transition-colors shadow-xs"
                >
                  <Save className="w-3.5 h-3.5 text-gray-600" /> {saving ? 'Đang lưu...' : 'Lưu nháp'}
                </button>
                <button
                  onClick={() => handleSavePost(true)}
                  disabled={saving || submitting || currentPostStatus === 'Submitted' || currentPostStatus === 'Approved'}
                  className="py-2 px-5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-1.5 disabled:opacity-50 transition-colors shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" /> {submitting ? 'Đang gửi...' : 'Gửi duyệt bài'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Post History */}
        <div className="mt-5 bg-white rounded-lg border border-gray-200 shadow-xs overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <h3 className="text-xs font-bold text-gray-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              Lịch sử bài viết của tôi ({filteredPosts.length})
            </h3>
            <div className="flex items-center gap-1 overflow-x-auto text-[11px]">
              {['ALL', 'Draft', 'Submitted', 'Scheduled', 'Success', 'ReworkRequired', 'Rejected'].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${statusFilter === st ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  {st === 'ALL' ? 'Tất cả' : (STATUS_MAP[st]?.label || st)}
                </button>
              ))}
            </div>
          </div>

          {loadingPosts ? (
            <div className="py-10 text-center text-xs text-gray-500">Đang tải danh sách bài viết...</div>
          ) : filteredPosts.length === 0 ? (
            <div className="py-10 text-center text-xs text-gray-400">Chưa có bài viết nào.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-600">
                    <th className="text-left px-4 py-2.5 font-semibold">Mã bài</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Sản phẩm</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Nội dung</th>
                    <th className="text-center px-4 py-2.5 font-semibold">Trạng thái</th>
                    <th className="text-center px-4 py-2.5 font-semibold">Ngày tạo</th>
                    <th className="text-center px-4 py-2.5 font-semibold w-24">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredPosts.map((post, i) => {
                    const sc = STATUS_MAP[post.status] || STATUS_MAP.Draft;
                    const isExpanded = expandedMetricsPostId === post.id;
                    const metrics = metricsByPostId[post.id];
                    return (
                      <React.Fragment key={post.id}>
                        <tr className={`hover:bg-blue-50/30 transition-colors ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                          <td className="px-4 py-2.5 font-mono font-bold text-gray-600">{post.code}</td>
                          <td className="px-4 py-2.5 font-medium text-gray-900">{post.productName}</td>
                          <td className="px-4 py-2.5 text-gray-600 max-w-xs truncate">{post.editedCaption}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${sc.bg} ${sc.text}`}>
                              {sc.icon} {sc.label}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-center text-gray-500">{new Date(post.createdAt).toLocaleDateString('vi-VN')}</td>
                          <td className="px-4 py-2.5 text-center">
                            {(post.status === 'Draft' || post.status === 'ReworkRequired') ? (
                              <button onClick={() => loadPostToEdit(post)} className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5 mx-auto">
                                Sửa <ChevronRight className="w-3 h-3" />
                              </button>
                            ) : post.status === 'Success' ? (
                              <button onClick={() => toggleMetrics(post.id)} className="text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-0.5 mx-auto">
                                <BarChart3 className="w-3.5 h-3.5" /> Chỉ số {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                              </button>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-emerald-50/40">
                            <td colSpan={6} className="px-4 py-3">
                              {loadingMetricsPostId === post.id ? (
                                <div className="text-xs text-gray-500 flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang tải chỉ số...</div>
                              ) : metrics ? (
                                <div className="flex items-center gap-6 text-xs">
                                  <span className="flex items-center gap-1.5 text-gray-700"><Eye className="w-3.5 h-3.5 text-blue-600" /> Reach: <b>{metrics.reachCount.toLocaleString()}</b></span>
                                  <span className="flex items-center gap-1.5 text-gray-700"><ThumbsUp className="w-3.5 h-3.5 text-blue-600" /> Thích: <b>{metrics.likeCount.toLocaleString()}</b></span>
                                  <span className="flex items-center gap-1.5 text-gray-700"><MessageSquare className="w-3.5 h-3.5 text-blue-600" /> Bình luận: <b>{metrics.commentCount.toLocaleString()}</b></span>
                                  <span className="flex items-center gap-1.5 text-gray-700"><Share2 className="w-3.5 h-3.5 text-blue-600" /> Chia sẻ: <b>{metrics.shareCount.toLocaleString()}</b></span>
                                  <span className="text-gray-400 ml-auto">
                                    {metrics.lastSyncedAt
                                      ? `Đồng bộ lần cuối: ${new Date(metrics.lastSyncedAt).toLocaleString('vi-VN')}`
                                      : 'Chưa có dữ liệu đồng bộ từ Facebook — hệ thống tự cập nhật mỗi 6 giờ.'}
                                  </span>
                                </div>
                              ) : (
                                <div className="text-xs text-gray-400">Không có dữ liệu.</div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

