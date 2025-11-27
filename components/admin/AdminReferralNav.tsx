import Link from 'next/link'

type NavKey = 'pending' | 'applications' | 'scouts' | 'scoutApplications'

interface AdminReferralNavProps {
  active: NavKey
}

const navItems: Array<{ key: NavKey; label: string; href: string }> = [
  { key: 'pending', label: 'Pending Payments', href: '/admin/referrals/pending-payments' },
  { key: 'applications', label: 'Referral Applications', href: '/admin/referrals' },
  { key: 'scouts', label: 'Manage Scouts', href: '/admin/scouts' },
  { key: 'scoutApplications', label: 'Scout Applications', href: '/admin/scout-applications' },
]

export default function AdminReferralNav({ active }: AdminReferralNavProps) {
  return (
    <div className="flex flex-wrap gap-2 md:gap-3">
      {navItems.map((item) => {
        const isActive = item.key === active
        const baseClasses =
          'px-4 py-2 rounded-lg font-medium text-sm transition-colors border-2'
        const activeClasses = 'bg-black text-white border-black hover:bg-gray-800'
        const inactiveClasses =
          'border-gray-300 text-gray-700 hover:bg-gray-50'

        return (
          <Link
            key={item.key}
            href={item.href}
            className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
          >
            {item.label}
          </Link>
        )
      })}
    </div>
  )
}

