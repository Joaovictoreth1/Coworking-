import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function Icon(props: IconProps) {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            {...props}
        />
    )
}

export const SearchIcon = (p: IconProps) => (
    <Icon {...p}>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
    </Icon>
)
export const ChevronDownIcon = (p: IconProps) => (
    <Icon {...p}>
        <path d="m6 9 6 6 6-6" />
    </Icon>
)
export const MenuIcon = (p: IconProps) => (
    <Icon {...p}>
        <path d="M4 6h16M4 12h16M4 18h16" />
    </Icon>
)
export const CloseIcon = (p: IconProps) => (
    <Icon {...p}>
        <path d="M6 6l12 12M18 6 6 18" />
    </Icon>
)
export const UserIcon = (p: IconProps) => (
    <Icon {...p}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
    </Icon>
)
export const UserPlusIcon = (p: IconProps) => (
    <Icon {...p}>
        <circle cx="9" cy="8" r="4" />
        <path d="M2 21a7 7 0 0 1 14 0M19 8v6M22 11h-6" />
    </Icon>
)
export const LoginIcon = (p: IconProps) => (
    <Icon {...p}>
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
    </Icon>
)
export const LogoutIcon = (p: IconProps) => (
    <Icon {...p}>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </Icon>
)
export const EyeIcon = (p: IconProps) => (
    <Icon {...p}>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
    </Icon>
)
export const EyeOffIcon = (p: IconProps) => (
    <Icon {...p}>
        <path d="M3 3l18 18M10.6 6.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.7A17 17 0 0 0 2 12s3.5 7 10 7a10 10 0 0 0 4-.8M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </Icon>
)

export const CheckIcon = (p: IconProps) => (
    <Icon {...p}>
        <path d="M20 6 9 17l-5-5" />
    </Icon>
)
export const PlusIcon = (p: IconProps) => (
    <Icon {...p}>
        <path d="M12 5v14M5 12h14" />
    </Icon>
)
export const TrashIcon = (p: IconProps) => (
    <Icon {...p}>
        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v6M14 11v6" />
    </Icon>
)
export const PencilIcon = (p: IconProps) => (
    <Icon {...p}>
        <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </Icon>
)
export const ImageIcon = (p: IconProps) => (
    <Icon {...p}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
    </Icon>
)
export const ArrowLeftIcon = (p: IconProps) => (
    <Icon {...p}>
        <path d="M19 12H5M12 19l-7-7 7-7" />
    </Icon>
)
export const ChevronLeftIcon = (p: IconProps) => (
    <Icon {...p}>
        <path d="m15 18-6-6 6-6" />
    </Icon>
)
export const ChevronRightIcon = (p: IconProps) => (
    <Icon {...p}>
        <path d="m9 18 6-6-6-6" />
    </Icon>
)
export const StarIcon = (p: IconProps) => (
    <Icon {...p}>
        <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z" />
    </Icon>
)
export const MapPinIcon = (p: IconProps) => (
    <Icon {...p}>
        <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" />
        <circle cx="12" cy="10" r="3" />
    </Icon>
)
export const UploadIcon = (p: IconProps) => (
    <Icon {...p}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
    </Icon>
)
export const HeartIcon = (p: IconProps) => (
    <Icon {...p}>
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8Z" />
    </Icon>
)
