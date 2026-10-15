// Espaço da logo. Para usar a sua, troque o conteúdo por <img src={...} alt="" className="h-full w-full" />
export default function Logo({ className = 'h-9 w-9' }: { className?: string }) {
    return (
        <span
            className={`inline-grid shrink-0 place-items-center rounded-md bg-indigo-500 text-white ${className}`}
            aria-hidden="true"
        >
            <svg
                viewBox="0 0 24 24"
                className="h-1/2 w-1/2"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M5 19V5l7 9 7-9v14" />
            </svg>
        </span>
    )
}
