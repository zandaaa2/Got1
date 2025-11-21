'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import Image from 'next/image'
import { collegeEntries } from '@/lib/college-data'
import CollegeSelector from '@/components/profile/CollegeSelector'
import Modal from '@/components/shared/Modal'

interface PlayerOffer {
  id: string
  profile_id: string
  offer_type: 'scholarship' | 'preferred_walk_on'
  school: string
  school_slug: string | null
  start_date: string | null
  coach_name: string | null
  coach_email: string | null
  coach_phone: string | null
  status: 'offered' | 'committed'
  created_at: string
  updated_at: string
}

interface PlayerOffersSectionProps {
  profileId: string
  userId: string
  isOwnProfile: boolean
}

export default function PlayerOffersSection({
  profileId,
  userId,
  isOwnProfile,
}: PlayerOffersSectionProps) {
  const [offers, setOffers] = useState<PlayerOffer[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingOffer, setEditingOffer] = useState<PlayerOffer | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadOffers()
  }, [profileId])

  const loadOffers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('player_offers')
        .select('*')
        .eq('profile_id', profileId)
        .order('status', { ascending: false }) // committed first
        .order('created_at', { ascending: false })

      if (error) throw error
      setOffers(data || [])
    } catch (error) {
      console.error('Error loading offers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (offerId: string) => {
    if (!confirm('Are you sure you want to delete this offer?')) return

    try {
      const { error } = await supabase
        .from('player_offers')
        .delete()
        .eq('id', offerId)
        .eq('profile_id', profileId)

      if (error) throw error
      loadOffers()
    } catch (error) {
      console.error('Error deleting offer:', error)
      alert('Failed to delete offer. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-32 bg-gray-200 rounded" />
          <div className="h-20 bg-gray-200 rounded" />
        </div>
      </div>
    )
  }

  const committedOffer = offers.find((o) => o.status === 'committed')

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl md:text-2xl font-bold text-black">College Offers</h2>
          {isOwnProfile && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              + Add Offer
            </button>
          )}
        </div>

        {offers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {isOwnProfile ? 'No offers yet. Click "Add Offer" to add one.' : 'No offers listed.'}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Committed offer displayed first */}
            {committedOffer && (
              <OfferCard
                offer={committedOffer}
                isOwnProfile={isOwnProfile}
                onEdit={() => setEditingOffer(committedOffer)}
                onDelete={() => handleDelete(committedOffer.id)}
              />
            )}

            {/* Other offers */}
            {offers
              .filter((o) => o.status === 'offered')
              .map((offer) => (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  isOwnProfile={isOwnProfile}
                  onEdit={() => setEditingOffer(offer)}
                  onDelete={() => handleDelete(offer.id)}
                />
              ))}
          </div>
        )}
      </div>

      {(showAddModal || editingOffer) && (
        <OfferFormModal
          profileId={profileId}
          userId={userId}
          existingOffer={editingOffer}
          committedOfferId={committedOffer?.id}
          onClose={() => {
            setShowAddModal(false)
            setEditingOffer(null)
          }}
          onSuccess={() => {
            setShowAddModal(false)
            setEditingOffer(null)
            loadOffers()
          }}
        />
      )}
    </>
  )
}

function OfferCard({
  offer,
  isOwnProfile,
  onEdit,
  onDelete,
}: {
  offer: PlayerOffer
  isOwnProfile: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const college = collegeEntries.find((c) => c.slug === offer.school_slug || c.name === offer.school)

  return (
    <div
      className={`border rounded-lg p-4 ${
        offer.status === 'committed'
          ? 'border-green-500 bg-green-50'
          : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          {college?.logo && (
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
              <Image
                src={college.logo}
                alt={college.name}
                width={48}
                height={48}
                className="object-contain w-full h-full"
                unoptimized
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-black text-lg">{offer.school}</h3>
              {offer.status === 'committed' && (
                <span className="px-2 py-0.5 bg-green-600 text-white text-xs font-semibold rounded-full">
                  Committed
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-2">
              {offer.offer_type === 'scholarship' ? 'Scholarship' : 'Preferred Walk-On'}
            </p>
            {offer.start_date && (
              <p className="text-xs text-gray-500 mb-1">
                Start Date: {new Date(offer.start_date).toLocaleDateString()}
              </p>
            )}
            {offer.coach_name && (
              <p className="text-xs text-gray-500 mb-1">
                Coach: {offer.coach_name}
                {offer.coach_email && ` (${offer.coach_email})`}
                {offer.coach_phone && ` • ${offer.coach_phone}`}
              </p>
            )}
          </div>
        </div>
        {isOwnProfile && (
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={onEdit}
              className="px-3 py-1 text-sm text-gray-700 hover:text-black border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={onDelete}
              className="px-3 py-1 text-sm text-red-600 hover:text-red-800 border border-red-300 rounded hover:bg-red-50 transition-colors"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

interface OfferFormModalProps {
  profileId: string
  userId: string
  existingOffer: PlayerOffer | null
  committedOfferId: string | undefined
  onClose: () => void
  onSuccess: () => void
}

function OfferFormModal({
  profileId,
  userId,
  existingOffer,
  committedOfferId,
  onClose,
  onSuccess,
}: OfferFormModalProps) {
  const [formData, setFormData] = useState({
    offer_type: (existingOffer?.offer_type || 'scholarship') as 'scholarship' | 'preferred_walk_on',
    school: existingOffer?.school || '',
    schoolSlug: existingOffer?.school_slug || '',
    start_date: existingOffer?.start_date || '',
    coach_name: existingOffer?.coach_name || '',
    coach_email: existingOffer?.coach_email || '',
    coach_phone: existingOffer?.coach_phone || '',
    status: (existingOffer?.status || 'offered') as 'offered' | 'committed',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Validation
      if (!formData.school.trim()) {
        setError('School is required')
        setLoading(false)
        return
      }

      // If committing this offer, uncommit the existing one
      if (formData.status === 'committed' && committedOfferId && committedOfferId !== existingOffer?.id) {
        await supabase
          .from('player_offers')
          .update({ status: 'offered' })
          .eq('id', committedOfferId)
      }

      const offerData = {
        profile_id: profileId,
        offer_type: formData.offer_type,
        school: formData.school.trim(),
        school_slug: formData.schoolSlug || null,
        start_date: formData.start_date || null,
        coach_name: formData.coach_name.trim() || null,
        coach_email: formData.coach_email.trim() || null,
        coach_phone: formData.coach_phone.trim() || null,
        status: formData.status,
      }

      if (existingOffer) {
        // Update existing offer
        const { error: updateError } = await supabase
          .from('player_offers')
          .update(offerData)
          .eq('id', existingOffer.id)

        if (updateError) throw updateError
      } else {
        // Create new offer
        const { error: insertError } = await supabase
          .from('player_offers')
          .insert(offerData)

        if (insertError) throw insertError
      }

      onSuccess()
    } catch (err: any) {
      console.error('Error saving offer:', err)
      setError(err.message || 'Failed to save offer. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={true} onClose={onClose} title={existingOffer ? 'Edit Offer' : 'Add Offer'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-black mb-2">
            Offer Type <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.offer_type}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                offer_type: e.target.value as 'scholarship' | 'preferred_walk_on',
              }))
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            required
          >
            <option value="scholarship">Scholarship</option>
            <option value="preferred_walk_on">Preferred Walk-On</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-black mb-2">
            School <span className="text-red-500">*</span>
          </label>
          <CollegeSelector
            value={formData.school}
            onChange={(value) => {
              setFormData((prev) => {
                // Try to find the slug from the selected school
                const college = collegeEntries.find(
                  (c) => c.name.toLowerCase() === value.toLowerCase()
                )
                return {
                  ...prev,
                  school: value,
                  schoolSlug: college?.slug || '',
                }
              })
            }}
            placeholder="Search for school"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-black mb-2">Start Date</label>
          <input
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData((prev) => ({ ...prev, start_date: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-black mb-2">Coach Name</label>
          <input
            type="text"
            value={formData.coach_name}
            onChange={(e) => setFormData((prev) => ({ ...prev, coach_name: e.target.value }))}
            placeholder="e.g., Coach Smith"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-black mb-2">Coach Email</label>
          <input
            type="email"
            value={formData.coach_email}
            onChange={(e) => setFormData((prev) => ({ ...prev, coach_email: e.target.value }))}
            placeholder="coach@school.edu"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-black mb-2">Coach Phone</label>
          <input
            type="tel"
            value={formData.coach_phone}
            onChange={(e) => setFormData((prev) => ({ ...prev, coach_phone: e.target.value }))}
            placeholder="(555) 123-4567"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-black mb-2">
            Status <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.status}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                status: e.target.value as 'offered' | 'committed',
              }))
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            required
          >
            <option value="offered">Offered</option>
            <option value="committed">Committed</option>
          </select>
          {formData.status === 'committed' && committedOfferId && committedOfferId !== existingOffer?.id && (
            <p className="mt-1 text-xs text-orange-600">
              This will change your current commitment.
            </p>
          )}
        </div>

        <div className="flex gap-3 justify-end pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? 'Saving...' : existingOffer ? 'Update Offer' : 'Add Offer'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

