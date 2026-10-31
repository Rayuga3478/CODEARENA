import { Routes, Route, Navigate, useLocation, useMatch, useParams } from 'react-router-dom';
import { Suspense, lazy, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Layout';
import { Loading, Toaster } from '@/components/ui';
import { HomePage } from '@/pages/HomePage';
import { ProblemsPage } from '@/pages/ProblemsPage';
const ProblemDetailPage = lazy(() => import('@/pages/ProblemDetailPage').then((m) => ({ default: m.ProblemDetailPage })));
const ProfilePage = lazy(() => import('@/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
import { SubmissionsPage } from '@/pages/SubmissionsPage';
import { ContestsPage } from '@/pages/ContestsPage';
import { ContestDetailPage } from '@/pages/ContestDetailPage';
import { RankingsPage } from '@/pages/RankingsPage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { ForgotPasswordPage, ResetPasswordPage, VerifyEmailPage } from '@/pages/AccountPages';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { DiscussionsPage } from '@/pages/DiscussionsPage';
import { DiscussionDetailPage } from '@/pages/DiscussionDetailPage';
import { useAuthStore } from '@/stores/auth';
import { setAccessTokenGetter } from '@/lib/api';

/** Legacy /problems/:slug/submit links now open the merged workspace. */
function SubmitRedirect() {
  const { slug } = useParams();
  return <Navigate to={`/problems/${slug}`} replace />;
}

export function App() {
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const location = useLocation();
  const inWorkspace = useMatch('/problems/:slug') !== null;

  // Register the access token getter for the API client
  useEffect(() => {
    setAccessTokenGetter(() => useAuthStore.getState().accessToken);
  }, []);

  // Try to restore session on mount
  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  // Scroll to top on navigation (keep hash anchors working)
  useEffect(() => {
    if (!location.hash) window.scrollTo({ top: 0 });
  }, [location.pathname, location.hash]);

  return (
    <>
      <div className="desk-bg" aria-hidden="true" />
      <Navbar />
      <main id="main" className={`app-main ${inWorkspace ? 'app-main--workspace' : ''}`}>
        <div key={location.pathname} className="page-enter">
          <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/problems" element={<ProblemsPage />} />
            <Route path="/problems/:slug" element={<ProblemDetailPage />} />
            <Route path="/problems/:slug/submit" element={<SubmitRedirect />} />
            <Route path="/submissions" element={<SubmissionsPage />} />
            <Route path="/contests" element={<ContestsPage />} />
            <Route path="/contests/:id" element={<ContestDetailPage />} />
            <Route path="/rankings" element={<RankingsPage />} />
            <Route path="/discuss" element={<DiscussionsPage />} />
            <Route path="/discuss/:id" element={<DiscussionDetailPage />} />
            <Route path="/user/:handle" element={<ProfilePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          </Suspense>
        </div>
      </main>
      {!inWorkspace && <Footer />}
      <Toaster />
    </>
  );
}
