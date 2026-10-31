import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, PenSquare } from 'lucide-react';
import { api } from '@/lib/api';
import type { Paginated } from '@/lib/types';
import { errorMessage, timeAgo } from '@/lib/format';
import { useDocumentTitle } from '@/lib/hooks';
import { useAuthStore } from '@/stores/auth';
import { Container, PageHeader } from '@/components/Layout';
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  Field,
  IconDiscuss,
  Input,
  LinkButton,
  Modal,
  Pagination,
  SkeletonRows,
  StatusCell,
  Textarea,
  UserLink,
  Window,
  toast,
} from '@/components/ui';

export interface DiscussionListItem {
  id: string;
  title: string;
  createdAt: string;
  author: { handle: string; rating: number };
  problem: { slug: string; title: string } | null;
  commentCount: number;
}

export function DiscussionsPage() {
  useDocumentTitle('Discuss');
  const { isAuthenticated } = useAuthStore();
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [composing, setComposing] = useState(false);

  const list = useQuery({
    queryKey: ['discussions', page],
    queryFn: () => api.get<Paginated<DiscussionListItem>>(`/discussions?page=${page}&limit=20`),
  });

  return (
    <Container>
      <PageHeader
        eyebrow="Community"
        title="Discuss"
        description="Ask questions, share approaches and post editorials."
        actions={
          isAuthenticated ? (
            <Button variant="primary" onClick={() => setComposing(true)} leading={<PenSquare size={15} />}>New thread</Button>
          ) : (
            <LinkButton to="/login?next=/discuss">Log in to post</LinkButton>
          )
        }
      />

      <Window
        title="Message Board"
        icon={<IconDiscuss width={16} height={16} />}
        flush
        statusbar={<StatusCell>{list.data ? `${list.data.pagination.total} threads` : 'Loading…'}</StatusCell>}
      >
        {list.isError ? (
          <div className="p-4"><Alert tone="bad">{(list.error as Error).message}</Alert></div>
        ) : list.isLoading ? (
          <SkeletonRows rows={8} cols={3} />
        ) : !list.data?.data.length ? (
          <EmptyState icon={<MessageSquare />} title="No threads yet" description="Start the first discussion." />
        ) : (
          <ul className="list-none m-0 p-0" style={{ background: 'var(--well)' }}>
            {list.data.data.map((d) => (
              <li key={d.id} className="flex items-start gap-3 px-4 py-3 border-b" style={{ borderColor: 'color-mix(in srgb, var(--lo) 30%, transparent)' }}>
                <MessageSquare size={18} className="t-muted mt-1 flex-none" />
                <div className="flex-1 min-w-0">
                  <Link to={`/discuss/${d.id}`} className="os-row-link font-semibold text-[15px]">{d.title}</Link>
                  <div className="text-[12px] t-muted mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <UserLink handle={d.author.handle} rating={d.author.rating} />
                    <span>· {timeAgo(d.createdAt)}</span>
                    {d.problem && (
                      <Link to={`/problems/${d.problem.slug}`}><Badge flat>{d.problem.title}</Badge></Link>
                    )}
                  </div>
                </div>
                <span className="t-mono text-[13px] t-secondary flex-none inline-flex items-center gap-1" title="Replies">
                  <MessageSquare size={12} /> {d.commentCount}
                </span>
              </li>
            ))}
          </ul>
        )}
        {list.data && list.data.pagination.totalPages > 1 && (
          <div className="p-3">
            <Pagination page={page} totalPages={list.data.pagination.totalPages} onChange={(p) => setParams({ page: String(p) })} />
          </div>
        )}
      </Window>

      <NewThreadModal open={composing} onClose={() => setComposing(false)} />
    </Container>
  );
}

function NewThreadModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const create = useMutation({
    mutationFn: () => api.post<{ discussion: { id: string } }>('/discussions', { title: title.trim(), content: content.trim() }),
    onSuccess: ({ discussion }) => {
      toast.ok('Thread posted');
      qc.invalidateQueries({ queryKey: ['discussions'] });
      setTitle('');
      setContent('');
      onClose();
      navigate(`/discuss/${discussion.id}`);
    },
  });
  const invalid = title.trim().length < 3 || content.trim().length < 10;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!invalid) create.mutate();
  };

  return (
    <Modal open={open} onClose={onClose} title="New thread" width={640}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {create.isError && <Alert tone="bad">{errorMessage(create.error)}</Alert>}
        <Field label="Title" htmlFor="thread-title" hint="At least 3 characters">
          <Input id="thread-title" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Message" htmlFor="thread-content" hint="At least 10 characters. Use `backticks` for inline code.">
          <Textarea id="thread-content" rows={8} value={content} onChange={(e) => setContent(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={invalid || create.isPending}>
            {create.isPending ? 'Posting…' : 'Post thread'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
