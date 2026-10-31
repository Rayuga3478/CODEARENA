import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Reply } from 'lucide-react';
import { api } from '@/lib/api';
import { errorMessage, formatDateTime, timeAgo } from '@/lib/format';
import { useDocumentTitle } from '@/lib/hooks';
import { useAuthStore } from '@/stores/auth';
import { Container } from '@/components/Layout';
import { Alert, Badge, Button, EmptyState, LinkButton, Loading, Textarea, UserAvatar, UserLink, Window, toast } from '@/components/ui';

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  parentId: string | null;
  author: { handle: string; rating: number };
}

interface Discussion {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  author: { handle: string; rating: number; avatar: string | null };
  problem: { slug: string; title: string } | null;
  comments: Comment[];
}

/** Plain text with `inline code`. */
function Text({ text }: { text: string }) {
  return (
    <div className="os-prose">
      {text.split(/(`[^`]+`)/g).map((p, i) => (p.startsWith('`') && p.endsWith('`') && p.length > 2 ? <code key={i}>{p.slice(1, -1)}</code> : <span key={i}>{p}</span>))}
    </div>
  );
}

export function DiscussionDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuthStore();
  const qc = useQueryClient();
  const [reply, setReply] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);

  const q = useQuery({ queryKey: ['discussion', id], queryFn: () => api.get<{ discussion: Discussion }>(`/discussions/${id}`) });
  const d = q.data?.discussion;
  useDocumentTitle(d?.title ?? 'Discussion');

  const post = useMutation({
    mutationFn: () => api.post(`/discussions/${id}/comments`, { content: reply.trim(), ...(replyTo ? { parentId: replyTo.id } : {}) }),
    onSuccess: () => {
      setReply('');
      setReplyTo(null);
      toast.ok('Reply posted');
      qc.invalidateQueries({ queryKey: ['discussion', id] });
      qc.invalidateQueries({ queryKey: ['discussions'] });
    },
  });

  if (q.isLoading) return <Loading label="Loading thread…" />;
  if (q.isError || !d) {
    return (
      <Container>
        <Window title="Error" tone="bad" className="max-w-lg mx-auto">
          <Alert tone="bad">{errorMessage(q.error, 'Thread not found')}</Alert>
          <div className="mt-4"><LinkButton to="/discuss" leading={<ArrowLeft size={14} />}>Back to Discuss</LinkButton></div>
        </Window>
      </Container>
    );
  }

  const byId = new Map(d.comments.map((c) => [c.id, c]));
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (reply.trim()) post.mutate();
  };

  return (
    <Container>
      <div className="mx-auto" style={{ maxWidth: 920 }}>
      <Link to="/discuss" className="on-desk inline-flex items-center gap-1 text-[14px] mb-4 opacity-90">
        <ArrowLeft size={14} /> Discuss
      </Link>

      <Window title={d.title} elevated className="mb-6 window-open">
        <div className="p-1 sm:p-3">
          <h1 className="t-h3 text-[26px] normal-case m-0" style={{ textTransform: 'none', letterSpacing: '0.02em' }}>{d.title}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2 mb-4 text-[13px] t-muted">
            <UserAvatar handle={d.author.handle} avatar={d.author.avatar} size={22} />
            <UserLink handle={d.author.handle} rating={d.author.rating} />
            <span title={formatDateTime(d.createdAt)}>· {timeAgo(d.createdAt)}</span>
            {d.problem && <Link to={`/problems/${d.problem.slug}`}><Badge flat>{d.problem.title}</Badge></Link>}
          </div>
          <div className="os-well"><div className="os-well__inner"><Text text={d.content} /></div></div>
        </div>
      </Window>

      <Window title={`Replies (${d.comments.length})`} controls={false} className="mb-6">
        {d.comments.length === 0 ? (
          <EmptyState title="No replies yet" description={isAuthenticated ? 'Be the first to reply.' : undefined} />
        ) : (
          <ol className="list-none m-0 p-0 flex flex-col gap-3">
            {d.comments.map((c) => {
              const parent = c.parentId ? byId.get(c.parentId) : undefined;
              return (
                <li key={c.id} id={`c-${c.id}`} className="os-well">
                  <div className="os-well__inner" style={{ padding: 12 }}>
                    <div className="flex flex-wrap items-center gap-2 text-[13px] t-muted mb-2">
                      <UserLink handle={c.author.handle} rating={c.author.rating} />
                      <span title={formatDateTime(c.createdAt)}>· {timeAgo(c.createdAt)}</span>
                      {parent && <a href={`#c-${parent.id}`} className="text-[12px]">↪ reply to {parent.author.handle}</a>}
                      {isAuthenticated && (
                        <button type="button" className="os-btn os-btn--sm os-btn--ghost ml-auto" onClick={() => { setReplyTo(c); document.getElementById('reply-box')?.focus(); }}>
                          <Reply size={12} /> Reply
                        </button>
                      )}
                    </div>
                    <Text text={c.content} />
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Window>

      {isAuthenticated ? (
        <Window title="Post a reply" controls={false}>
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            {post.isError && <Alert tone="bad">{errorMessage(post.error)}</Alert>}
            {replyTo && (
              <div className="flex items-center gap-2 text-[13px]">
                Replying to <strong>{replyTo.author.handle}</strong>
                <button type="button" className="os-btn os-btn--sm os-btn--ghost" onClick={() => setReplyTo(null)}>Cancel</button>
              </div>
            )}
            <Textarea id="reply-box" rows={5} value={reply} maxLength={10000} onChange={(e) => setReply(e.target.value)} placeholder="Write a reply…" aria-label="Reply" />
            <div className="flex justify-end">
              <Button type="submit" variant="primary" disabled={!reply.trim() || post.isPending}>{post.isPending ? 'Posting…' : 'Post reply'}</Button>
            </div>
          </form>
        </Window>
      ) : (
        <Alert tone="info"><Link to={`/login?next=/discuss/${id}`}>Log in</Link> to join the discussion.</Alert>
      )}
      </div>
    </Container>
  );
}
