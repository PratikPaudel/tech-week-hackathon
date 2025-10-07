import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type Props = {
    name: string
    description?: string | null
    questionCount: number
    answeredCount: number
}

export function FolderCard({ name, description, questionCount, answeredCount }: Props) {
    const completion = questionCount > 0 ? Math.round((answeredCount / questionCount) * 100) : 0
    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
                <CardTitle className="text-base">{name}</CardTitle>
                {description ? (
                    <CardDescription className="line-clamp-2">{description}</CardDescription>
                ) : null}
            </CardHeader>
            <CardContent className="text-sm text-gray-600">
                <div className="flex items-center justify-between">
                    <span>{questionCount} questions</span>
                    <span>{completion}% complete</span>
                </div>
            </CardContent>
        </Card>
    )
}


