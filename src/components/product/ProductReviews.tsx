"use client";
import { useState, useEffect, useCallback } from "react";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { StarRating } from "@/components/ui/StarRating";
import {
  getReviewsForProduct,
  addReview,
  getAverageRating,
  hasUserReviewed,
} from "@/lib/reviewService";
import type { ProductReview } from "@/types/reviews";
import { formatDate } from "@/lib/format";

interface Props {
  productId: number;
}

export function ProductReviews({ productId }: Props) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [avg, setAvg] = useState(0);
  const [count, setCount] = useState(0);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    const data = getReviewsForProduct(productId);
    const stats = getAverageRating(productId);
    setReviews(data);
    setAvg(stats.avg);
    setCount(stats.count);
    if (user) {
      setAlreadyReviewed(hasUserReviewed(productId, user.id));
    }
  }, [productId, user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (rating === 0) {
      setError("Selecciona una puntuación");
      return;
    }
    if (!title.trim()) {
      setError("El título es obligatorio");
      return;
    }
    if (!body.trim()) {
      setError("Escribe tu opinión");
      return;
    }
    setSubmitting(true);
    setError(null);
    addReview({
      productId,
      userId: user.id,
      userName: `${user.name} ${user.lastName}`,
      rating,
      title: title.trim(),
      body: body.trim(),
      verified: false,
    });
    setShowForm(false);
    setRating(0);
    setTitle("");
    setBody("");
    setSubmitting(false);
    reload();
  };

  // Star distribution
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  return (
    <section className="mb-12">
      <h2 className="mb-6 text-xl font-bold text-gray-900">
        Opiniones de clientes
      </h2>

      {/* Summary */}
      <div className="mb-8 flex flex-col gap-6 rounded-2xl border border-gray-200 bg-white p-6 sm:flex-row sm:items-center">
        {/* Average */}
        <div className="flex flex-col items-center gap-1 sm:pr-8 sm:border-r sm:border-gray-200">
          <span className="text-5xl font-bold text-gray-900">
            {count === 0 ? "—" : avg.toFixed(1)}
          </span>
          <StarRating rating={avg} size={18} />
          <span className="text-sm text-gray-500">
            {count} {count === 1 ? "opinión" : "opiniones"}
          </span>
        </div>

        {/* Distribution */}
        <div className="flex-1 space-y-1.5">
          {distribution.map(({ star, count: c }) => (
            <div key={star} className="flex items-center gap-2">
              <span className="w-8 text-right text-xs text-gray-500">
                {star}★
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-amber-400 transition-all"
                  style={{
                    width:
                      count > 0 ? `${Math.round((c / count) * 100)}%` : "0%",
                  }}
                />
              </div>
              <span className="w-4 text-xs text-gray-400">{c}</span>
            </div>
          ))}
        </div>

        {/* Write review CTA */}
        <div className="sm:pl-8 sm:border-l sm:border-gray-200">
          {user ? (
            alreadyReviewed ? (
              <p className="text-sm text-gray-500">Ya has valorado este producto</p>
            ) : (
              <button
                onClick={() => setShowForm((v) => !v)}
                className="rounded-xl bg-[#2563eb] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#1d4ed8]"
              >
                Escribir opinión
              </button>
            )
          ) : (
            <p className="text-sm text-gray-500">
              Inicia sesión para valorar este producto
            </p>
          )}
        </div>
      </div>

      {/* Review form */}
      {showForm && user && !alreadyReviewed && (
        <form
          onSubmit={handleSubmit}
          className="mb-8 rounded-2xl border border-[#2563eb]/20 bg-blue-50/30 p-6"
        >
          <h3 className="mb-4 font-bold text-gray-900">Tu opinión</h3>
          <div className="mb-4">
            <label className="mb-1 block text-sm font-semibold text-gray-700">
              Puntuación
            </label>
            <StarRating
              rating={rating}
              size={24}
              interactive
              onRate={setRating}
            />
          </div>
          <div className="mb-3">
            <label className="mb-1 block text-sm font-semibold text-gray-700">
              Título
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              placeholder="Resume tu experiencia"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#2563eb] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]"
            />
          </div>
          <div className="mb-4">
            <label className="mb-1 block text-sm font-semibold text-gray-700">
              Opinión
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={1000}
              rows={4}
              placeholder="Cuéntanos más sobre el producto..."
              className="w-full resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#2563eb] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]"
            />
          </div>
          {error && (
            <p className="mb-3 text-sm font-medium text-red-500">{error}</p>
          )}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-[#2563eb] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#1d4ed8] disabled:opacity-50"
            >
              Publicar opinión
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Reviews list */}
      {reviews.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">
          Aún no hay opiniones. ¡Sé el primero en valorar este producto!
        </p>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="rounded-2xl border border-gray-200 bg-white p-5"
            >
              <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <StarRating rating={review.rating} size={14} />
                  <h4 className="mt-1 font-semibold text-gray-900">
                    {review.title}
                  </h4>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs text-gray-400">
                    {formatDate(review.createdAt)}
                  </span>
                  {review.verified && (
                    <span className="flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-[11px] font-semibold text-green-700">
                      <ShieldCheck size={11} />
                      Compra verificada
                    </span>
                  )}
                </div>
              </div>
              <p className="text-sm leading-relaxed text-gray-600">
                {review.body}
              </p>
              <p className="mt-2 text-xs text-gray-400">{review.userName}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
