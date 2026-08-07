import React, { useState, useEffect } from 'react';
import {
  Sparkles, Send, Save, RefreshCw, Image as ImageIcon,
  CheckCircle2, Clock, AlertCircle, XCircle, ChevronRight,
  Tag, ThumbsUp, MessageSquare, Share2, Globe, Plus
} from 'lucide-react';
import api from '../../services/api';

interface Product {
  id: string;
  name: string;
  sku: string;
  standardListedPrice: number;
  unit: string;
  imageUrl?: string;
  description?: string;
}

interface MarketingOption {
  id: number;
  imageUrl: string;
  caption: string;
  hashtags: string;
  ctaText: string;
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

const STATUS_MAP: Record<string, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  Draft:          { label: 'Bản nháp',         bg: 'bg-gray-100',    text: 'text-gray-700',    icon: <Clock className="w-3 h-3" /> },
  Submitted:      { label: 'Chờ duyệt',        bg: 'bg-blue-50',     text: 'text-blue-700',    icon: <Send className="w-3 h-3" /> },
  Approved:       { label: 'Đã duyệt',         bg: 'bg-indigo-50',   text: 'text-indigo-700',  icon: <CheckCircle2 className="w-3 h-3" /> },
  Scheduled:      { label: 'Đã lên lịch',      bg: 'bg-indigo-50',   text: 'text-indigo-700',  icon: <Clock className="w-3 h-3" /> },
  Posting:        { label: 'Đang đăng',        bg: 'bg-emerald-50',  text: 'text-emerald-700', icon: <RefreshCw className="w-3 h-3 animate-spin" /> },
  Success:        { label: 'Đã đăng FB',       bg: 'bg-emerald-100', text: 'text-emerald-800', icon: <CheckCircle2 className="w-3 h-3" /> },
  ReworkRequired: { label: 'Cần sửa lại',      bg: 'bg-amber-50',    text: 'text-amber-700',   icon: <AlertCircle className="w-3 h-3" /> },
  Rejected:       { label: 'Từ chối',          bg: 'bg-rose-50',     text: 'text-rose-700',    icon: <XCircle className="w-3 h-3" /> },
  PublishFailed:  { label: 'Lỗi đăng bài',     bg: 'bg-rose-100',    text: 'text-rose-800',    icon: <XCircle className="w-3 h-3" /> },
};

export default function SalesAiContentStudio() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [templateName, setTemplateName] = useState<string>('Khuyến mãi hot');
  const [tone, setTone] = useState<string>('Hào hứng');
  const [prompt, setPrompt] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const [aiOptions, setAiOptions] = useState<MarketingOption[]>([]);
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [editedCaption, setEditedCaption] = useState('');
  const [editedImageUrl, setEditedImageUrl] = useState('');
  const [editedHashtags, setEditedHashtags] = useState('');
  const [editedCta, setEditedCta] = useState('');
  const [currentPostId, setCurrentPostId] = useState<string | null>(null);
  const [currentPostStatus, setCurrentPostStatus] = useState<string>('Draft');
  const [myPosts, setMyPosts] = useState<MarketingPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generatingSingleImage, setGeneratingSingleImage] = useState(false);

  useEffect(() => { fetchProducts(); fetchMyPosts(); }, []);

  const handleGenerateSingleImage = async () => {
    if (!selectedProductId) return alert('Vui lòng chọn sản phẩm trước!');
    const selectedProd = products.find(p => p.id === selectedProductId);
    const imgPrompt = prompt.trim() || `${selectedProd?.name || 'Vật tư đóng gói'} commercial studio photography`;

    setGeneratingSingleImage(true);
    try {
      const res = await api.post('/marketing-posts/generate-image', { prompt: imgPrompt });
      if (res.data?.imageUrl) {
        setEditedImageUrl(res.data.imageUrl);
        alert('Đã sinh ảnh AI thành công qua Gemini Imagen 3!');
      }
    } catch (err: any) {
      alert('Sinh ảnh AI thất bại: ' + (err.response?.data?.message || err.message));
    } finally {
      setGeneratingSingleImage(false);
    }
  };

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

  const handleGenerateAi = async () => {
    if (!selectedProductId) return alert('Vui lòng chọn sản phẩm!');
    setGenerating(true);
    try {
      const res = await api.post('/marketing-posts/generate-options', {
        productId: selectedProductId, prompt, templateName, tone
      });
      const options = res.data?.options || [];
      setAiOptions(options);
      if (options.length > 0) selectOption(options[0]);
    } catch (err: any) {
      alert('Tạo nội dung AI thất bại: ' + (err.response?.data?.message || err.message));
    } finally { setGenerating(false); }
  };

  const selectOption = (opt: MarketingOption) => {
    setSelectedOptionId(opt.id);
    setEditedCaption(opt.caption);
    setEditedImageUrl(opt.imageUrl);
    setEditedHashtags(opt.hashtags);
    setEditedCta(opt.ctaText);
    setCurrentPostId(null);
    setCurrentPostStatus('Draft');
  };

  const handleSavePost = async (submitImmediately: boolean = false) => {
    if (!selectedProductId) return alert('Vui lòng chọn sản phẩm.');
    if (!editedCaption.trim()) return alert('Vui lòng nhập nội dung bài viết.');
    if (submitImmediately) setSubmitting(true); else setSaving(true);
    try {
      if (currentPostId) {
        await api.put(`/marketing-posts/${currentPostId}`, {
          selectedImageUrl: editedImageUrl, editedCaption, hashtags: editedHashtags, ctaText: editedCta, submitImmediately
        });
        alert(submitImmediately ? 'Đã gửi bài viết cho Sales Manager duyệt!' : 'Đã lưu bài viết nháp!');
      } else {
        const selectedOpt = aiOptions.find(o => o.id === selectedOptionId);
        const res = await api.post('/marketing-posts', {
          productId: selectedProductId,
          promptUsed: prompt || `Template: ${templateName}, Tone: ${tone}`,
          templateName, tone,
          generatedImageUrl: selectedOpt?.imageUrl || editedImageUrl,
          generatedCaption: selectedOpt?.caption || editedCaption,
          selectedImageUrl: editedImageUrl, editedCaption, hashtags: editedHashtags, ctaText: editedCta, submitImmediately
        });
        setCurrentPostId(res.data.id);
        alert(submitImmediately ? 'Đã tạo và gửi duyệt bài viết!' : 'Đã lưu bài viết nháp!');
      }
      fetchMyPosts();
    } catch (err: any) { alert('Lỗi: ' + (err.response?.data?.message || err.message)); }
    finally { setSaving(false); setSubmitting(false); }
  };

  const loadPostToEdit = (post: MarketingPost) => {
    setCurrentPostId(post.id);
    setSelectedProductId(post.productId);
    setEditedCaption(post.editedCaption || '');
    setEditedImageUrl(post.selectedImageUrl || '');
    setEditedHashtags(post.hashtags || '');
    setEditedCta(post.ctaText || '');
    setCurrentPostStatus(post.status);
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* LEFT: Generator Config + AI Options */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-slate-50">
                <h3 className="text-xs font-bold text-gray-800 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  Bước 1 — Cấu hình AI Generator
                </h3>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">Sản phẩm *</label>
                  <select
                    value={selectedProductId}
                    onChange={e => setSelectedProductId(e.target.value)}
                    className="w-full text-xs border border-gray-300 rounded-md px-3 py-2 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    disabled={loadingProducts}
                  >
                    {products.length === 0 && <option value="">Đang tải...</option>}
                    {products.map(p => (
                      <option key={p.id} value={p.id}>[{p.sku}] {p.name} — {p.standardListedPrice?.toLocaleString()}đ/{p.unit}</option>
                    ))}
                  </select>
                  {selectedProduct && (
                    <div className="mt-1.5 text-[11px] text-gray-500">
                      SKU: <span className="font-mono font-semibold">{selectedProduct.sku}</span> · Giá: <span className="font-bold text-gray-800">{selectedProduct.standardListedPrice?.toLocaleString()} đ/{selectedProduct.unit}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">Template</label>
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
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">Yêu cầu bổ sung (Prompt)</label>
                  <textarea
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    rows={2}
                    placeholder="VD: Nhấn mạnh chiết khấu 15% cho đơn nguyên cuộn từ 100m..."
                    className="w-full text-xs border border-gray-300 rounded-md p-2.5 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <button
                  onClick={handleGenerateAi}
                  disabled={generating || !selectedProductId}
                  className="w-full py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                >
                  {generating
                    ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> AI đang tạo nội dung...</>
                    : <><Sparkles className="w-3.5 h-3.5" /> Tạo bài viết với AI</>
                  }
                </button>
              </div>
            </div>

            {/* AI Options */}
            {aiOptions.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 bg-slate-50">
                  <h3 className="text-xs font-bold text-gray-800 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-blue-600" />
                    Bước 2 — Chọn phương án AI đề xuất
                  </h3>
                </div>
                <div className="p-4 space-y-2">
                  {aiOptions.map(opt => (
                    <div
                      key={opt.id}
                      onClick={() => selectOption(opt)}
                      className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                        selectedOptionId === opt.id
                          ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-200'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between font-semibold text-gray-800 mb-1">
                        <span>Phương án {opt.id}</span>
                        {selectedOptionId === opt.id && (
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">Đã chọn</span>
                        )}
                      </div>
                      <p className="text-gray-600 line-clamp-3 whitespace-pre-line text-[11px] leading-relaxed">{opt.caption}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Editor + FB Preview */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-slate-50 flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-800 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-600" />
                  Bước 3 — Chỉnh sửa & xem trước
                </h3>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${statusCfg.bg} ${statusCfg.text}`}>
                  {statusCfg.icon} {statusCfg.label}
                </span>
              </div>

              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">Nội dung Caption</label>
                  <textarea
                    value={editedCaption}
                    onChange={e => setEditedCaption(e.target.value)}
                    rows={5}
                    className="w-full text-xs border border-gray-300 rounded-md p-3 leading-relaxed focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Nội dung bài đăng Facebook..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">Hashtags</label>
                    <input type="text" value={editedHashtags} onChange={e => setEditedHashtags(e.target.value)} className="w-full text-xs border border-gray-300 rounded-md py-2 px-3" placeholder="#VietTien #BaoBi" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">Nút CTA</label>
                    <input type="text" value={editedCta} onChange={e => setEditedCta(e.target.value)} className="w-full text-xs border border-gray-300 rounded-md py-2 px-3" placeholder="Nhắn tin ngay..." />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">URL Hình ảnh</label>
                  <div className="flex gap-2">
                    <input type="text" value={editedImageUrl} onChange={e => setEditedImageUrl(e.target.value)} className="flex-1 text-xs border border-gray-300 rounded-md py-2 px-3 font-mono" placeholder="https://..." />
                    {selectedProduct?.imageUrl && (
                      <button
                        type="button"
                        onClick={() => setEditedImageUrl(selectedProduct.imageUrl!)}
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
                      <span>{generatingSingleImage ? 'Đang tạo...' : 'Sinh ảnh AI Gemini'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Facebook Post Mockup */}
              <div className="mx-4 mb-4 border border-gray-200 rounded-lg bg-white overflow-hidden">
                <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-[11px] text-gray-500 font-medium">
                  <span className="flex items-center gap-1 text-blue-700 font-semibold">
                    <Globe className="w-3 h-3" /> Xem trước Facebook Page
                  </span>
                  <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-semibold">PREVIEW</span>
                </div>
                <div className="p-3 space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-blue-900 text-white font-bold text-[10px] flex items-center justify-center">VT</div>
                    <div>
                      <h4 className="text-[11px] font-bold text-gray-900 leading-tight">Công Ty Bao Bì Việt Tiến</h4>
                      <p className="text-[10px] text-gray-400 flex items-center gap-1">Vừa xong · <Globe className="w-2.5 h-2.5" /></p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-800 whitespace-pre-line leading-relaxed">
                    {editedCaption || <span className="text-gray-400 italic">Nội dung sẽ hiển thị tại đây...</span>}
                  </div>
                  {editedHashtags && <div className="text-xs font-semibold text-blue-600">{editedHashtags}</div>}
                  {editedCta && <div className="p-2 rounded-md bg-blue-50 border border-blue-100 text-xs font-semibold text-blue-800 text-center">{editedCta}</div>}
                  {editedImageUrl && (
                    <div className="rounded-md overflow-hidden border border-gray-100 bg-gray-100 max-h-60 flex items-center justify-center">
                      <img src={editedImageUrl} alt="Preview" className="w-full h-full object-cover" />
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
              <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => handleSavePost(false)}
                  disabled={saving || submitting}
                  className="py-2 px-4 rounded-lg text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 flex items-center gap-1.5 disabled:opacity-50 transition-colors"
                >
                  <Save className="w-3.5 h-3.5" /> {saving ? 'Đang lưu...' : 'Lưu nháp'}
                </button>
                <button
                  onClick={() => handleSavePost(true)}
                  disabled={saving || submitting || currentPostStatus === 'Submitted' || currentPostStatus === 'Approved'}
                  className="py-2 px-5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-1.5 disabled:opacity-50 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" /> {submitting ? 'Đang gửi...' : 'Gửi duyệt'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Post History */}
        <div className="mt-5 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <h3 className="text-xs font-bold text-gray-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              Lịch sử bài viết ({filteredPosts.length})
            </h3>
            <div className="flex items-center gap-1 overflow-x-auto text-[11px]">
              {['ALL', 'Draft', 'Submitted', 'Scheduled', 'Success', 'ReworkRequired', 'Rejected'].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    statusFilter === st ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {st === 'ALL' ? 'Tất cả' : (STATUS_MAP[st]?.label || st)}
                </button>
              ))}
            </div>
          </div>

          {loadingPosts ? (
            <div className="py-10 text-center text-xs text-gray-500">Đang tải...</div>
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
                    return (
                      <tr key={post.id} className={`hover:bg-blue-50/30 transition-colors ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
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
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
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
