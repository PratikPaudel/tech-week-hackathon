import { SignupForm } from '@/components/auth/signup-form'
import Link from 'next/link'

export default function SignupPage() {
    return (
        <div className="w-full max-w-md">
            <h1 className="text-2xl font-semibold mb-4 text-center">Create your account</h1>
            <SignupForm />
            <p className="text-sm text-gray-600 mt-4 text-center">
                Already have an account?{' '}
                <Link href="/login" className="text-blue-600 hover:underline">Sign in</Link>
            </p>
        </div>
    )
}


