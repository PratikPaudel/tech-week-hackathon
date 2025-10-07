import { FolderWithChildren } from '@/lib/utils'
import Link from 'next/link'
import { FolderCard } from './folder-card'

export function FolderTreeItem({ folder }: { folder: FolderWithChildren }) {
    return (
        <div>
            <Link href={`/folder/${folder.id}`} className="block">
                <FolderCard
                    name={folder.name}
                    description={folder.description}
                    questionCount={Number(folder.question_count ?? 0)}
                    answeredCount={Number(folder.answered_count ?? 0)}
                />
            </Link>
            {folder.children && folder.children.length > 0 && (
                <div className="ml-6 mt-2 space-y-2 border-l-2 pl-4">
                    {folder.children.map(child => (
                        <FolderTreeItem key={child.id} folder={child} />
                    ))}
                </div>
            )}
        </div>
    )
}
