import { createServerClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { getGradientForId } from '@/lib/gradients'
import { isMeaningfulAvatar } from '@/lib/avatar'
import ShareButton from '@/components/evaluations/ShareButton'
import type { Metadata } from 'next'

export async function generateMetadata({
  params,
}: {
  params: { id: string; token: string }
}): Promise<Metadata> {
  const supabase = createServerClient()
  
  // Fetch evaluation by token (no auth required)
  const { data: evaluation } = await supabase
    .from('evaluations')
    .select(`
      id,
      notes,
      completed_at,
      share_token,
      scout_id,
      player_id
    `)
    .eq('id', params.id)
    .eq('share_token', params.token)
    .eq('status', 'completed')
    .maybeSingle()

  if (!evaluation) {
    return {
      title: 'Evaluation Not Found | Got1',
    }
  }

  // Get player and scout profiles for metadata
  const userIds = [evaluation.scout_id, evaluation.player_id].filter(Boolean)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, full_name, avatar_url, organization')
    .in('user_id', userIds)

  const player = profiles?.find((p) => p.user_id === evaluation.player_id)
  const scout = profiles?.find((p) => p.user_id === evaluation.scout_id)

  const playerName = player?.full_name || 'Player'
  const scoutName = scout?.full_name || 'a scout'
  const organization = scout?.organization || 'Got1'
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://got1.app'
  const shareUrl = `${baseUrl}/evaluations/${params.id}/share/${params.token}`

  return {
    title: `${playerName}'s Evaluation from ${scoutName} | Got1`,
    description: `View ${playerName}'s evaluation from ${scoutName} at ${organization} on Got1.`,
    openGraph: {
      title: `${playerName}'s Evaluation | Got1`,
      description: `View ${playerName}'s evaluation from ${scoutName} at ${organization}.`,
      url: shareUrl,
      type: 'article',
      images: [
        {
          url: player?.avatar_url || `${baseUrl}/social/og-default.png?v=2`,
          width: 1200,
          height: 630,
          alt: `${playerName}'s evaluation from ${scoutName}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${playerName}'s Evaluation | Got1`,
      description: `View ${playerName}'s evaluation from ${scoutName} at ${organization}.`,
      images: [player?.avatar_url || `${baseUrl}/social/og-default.png?v=2`],
    },
  }
}

export default async function EvaluationSharePage({
  params,
}: {
  params: { id: string; token: string }
}) {
  const supabase = createServerClient()

  // Fetch evaluation by token (public access - no auth required)
  const { data: evaluation } = await supabase
    .from('evaluations')
    .select(`
      id,
      notes,
      completed_at,
      share_token,
      scout_id,
      player_id
    `)
    .eq('id', params.id)
    .eq('share_token', params.token)
    .eq('status', 'completed')
    .maybeSingle()

  if (!evaluation) {
    notFound()
  }

  // Get player and scout profiles
  const userIds = [evaluation.scout_id, evaluation.player_id].filter(Boolean)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, full_name, avatar_url, organization, position')
    .in('user_id', userIds)

  const player = profiles?.find((p) => p.user_id === evaluation.player_id)
  const scout = profiles?.find((p) => p.user_id === evaluation.scout_id)

  // Format completion date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-black">
            Got1
          </Link>
          <Link
            href="/auth/signin"
            className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        {/* Player Info */}
        <div className="mb-8 flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden flex-shrink-0">
            {player?.avatar_url && isMeaningfulAvatar(player.avatar_url) ? (
              <Image
                src={player.avatar_url}
                alt={player?.full_name || 'Player'}
                width={128}
                height={128}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className={`w-full h-full flex items-center justify-center text-4xl font-semibold text-white ${getGradientForId(
                  evaluation.player_id || evaluation.id
                )}`}
              >
                {player?.full_name?.charAt(0).toUpperCase() || 'P'}
              </div>
            )}
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-bold text-black mb-2">
              {player?.full_name || 'Player'}
            </h1>
            <p className="text-lg text-gray-600 mb-4">
              Evaluation from {scout?.full_name || 'a scout'}
              {scout?.organization && ` at ${scout.organization}`}
            </p>
            {evaluation.completed_at && (
              <p className="text-sm text-gray-500">
                Completed {formatDate(evaluation.completed_at)}
              </p>
            )}
          </div>
        </div>

        {/* Evaluation Content */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 md:p-8 mb-8">
          <div className="prose max-w-none">
            <div className="whitespace-pre-wrap text-black leading-relaxed">
              {evaluation.notes || 'No evaluation content available.'}
            </div>
          </div>
          {/* Share button - bottom left underneath evaluation */}
          <div className="mt-6 flex items-start">
            <ShareButton 
              evaluationId={evaluation.id} 
              evaluation={{
                id: evaluation.id,
                share_token: evaluation.share_token || null,
                status: 'completed',
                scout: scout,
              }}
            />
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 md:p-8 text-center">
          <h2 className="text-2xl font-bold text-black mb-2">
            Get Your Own Evaluation
          </h2>
          <p className="text-gray-600 mb-6">
            Connect with college scouts and get professional film evaluations on Got1.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
            >
              Create Account
            </Link>
            <Link
              href="/discover"
              className="px-6 py-3 bg-white text-black border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Browse Scouts
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

