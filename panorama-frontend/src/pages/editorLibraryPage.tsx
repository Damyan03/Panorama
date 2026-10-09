import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { createAuthRouteState } from '../auth/routeState';
import {
	type VideoListItem,
	videoTitleToSlug,
	createMyDraftVideo,
	deleteMyDraftVideo,
	getMyDraftVideos,
} from '../api/videos';
import { ConfirmDialog } from '../components/ui';
import Icon from '../components/Icon';
import { useAuth } from '../auth/AuthContext';
import { formatDurationMs } from '../utils/formatters/time';

type DraftLibraryItem = Pick<
	VideoListItem,
	'id' | 'title' | 'dayUploaded' | 'coverSrc' | 'views' | 'totalDuration'
>;

function EditorLibraryPage() {
	const { isReady, isAuthenticated } = useAuth();
	const location = useLocation();
	const authRouteState = createAuthRouteState(location);
	const navigate = useNavigate();
	const [items, setItems] = useState<DraftLibraryItem[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isCreating, setIsCreating] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [deletingDraftId, setDeletingDraftId] = useState<number | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);

	useEffect(() => {
		if (!isReady) {
			return;
		}

		if (!isAuthenticated) {
			setIsLoading(false);
			setItems([]);
			setError(null);
			return;
		}

		let active = true;
		setIsLoading(true);

		void getMyDraftVideos()
			.then((result) => {
				if (!active) {
					return;
				}

				setItems(result.items);
				setError(null);
			})
			.catch((err: unknown) => {
				if (!active) {
					return;
				}

				if (err instanceof ApiError && err.status === 401) {
					setError('Your session expired. Please log in again.');
				} else {
					setError('Unable to load your draft library.');
				}
				setItems([]);
			})
			.finally(() => {
				if (active) {
					setIsLoading(false);
				}
			});

		return () => {
			active = false;
		};
	}, [isAuthenticated, isReady]);

	const sortedItems = useMemo(
		() =>
			[...items].sort(
				(a, b) =>
					new Date(b.dayUploaded).getTime() -
					new Date(a.dayUploaded).getTime(),
			),
		[items],
	);

	async function handleCreateDraft() {
		setIsCreating(true);
		setError(null);

		try {
			const draft = await createMyDraftVideo();
			navigate(`/editor/${videoTitleToSlug(draft.title)}`);
		} catch (err: unknown) {
			if (err instanceof ApiError && err.status === 401) {
				setError('Your session expired. Please log in again.');
			} else {
				setError('Unable to create a new draft.');
			}
		} finally {
			setIsCreating(false);
		}
	}

	function handleDeleteDraft(draftId: number) {
		setDeletingDraftId(draftId);
	}

	function handleOpenDraft(draftTitle: string) {
		navigate(`/editor/${videoTitleToSlug(draftTitle)}`);
	}

	async function confirmDeleteDraft() {
		if (deletingDraftId === null) return;
		setIsDeleting(true);
		setError(null);

		try {
			await deleteMyDraftVideo(deletingDraftId);
			setItems((prev) =>
				prev.filter((item) => item.id !== deletingDraftId),
			);
			setDeletingDraftId(null);
		} catch (err: unknown) {
			if (err instanceof ApiError && err.status === 401) {
				setError('Your session expired. Please log in again.');
			} else {
				setError('Unable to delete draft.');
			}
		} finally {
			setIsDeleting(false);
		}
	}

	function cancelDeleteDraft() {
		setDeletingDraftId(null);
	}

	if (!isReady || isLoading) {
		return (
			<div className="container-main py-6">
				<h1 className="text-heading-md">Draft Library</h1>
				<p className="mt-4 text-muted">Loading drafts...</p>
			</div>
		);
	}

	if (!isAuthenticated) {
		return (
			<div className="container-main py-6">
				<div className="card-panel">
					<h1 className="text-heading-md">
						Start creating videos
					</h1>
					<p className="mt-4 text-muted">
						Sign in or create an account to start creating,
						publishing, and sharing your own videos. Build your
						creative portfolio and earn feedback from the Panorama
						community.
					</p>
					<div className="mt-6 flex gap-3">
						<Link
							to="/login"
							state={authRouteState}
							className="btn btn-primary flex-1 justify-center"
						>
							Log in
						</Link>
						<Link
							to="/register"
							state={authRouteState}
							className="btn btn-secondary flex-1 justify-center"
						>
							Sign up
						</Link>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="container-main py-6">
			<div className="mb-6 flex items-center justify-between gap-3">
				<h1 className="text-heading-md">Draft Library</h1>
				<span className="text-muted">{sortedItems.length} drafts</span>
			</div>

			{error && (
				<div className="mb-4 badge badge-error w-full justify-start">
					{error}
				</div>
			)}

			{!error && sortedItems.length === 0 && (
				<div className="card p-4 text-muted">No drafts yet.</div>
			)}

			{sortedItems.length > 0 && (
				<div className="space-y-3">
					{sortedItems.map((draft) => (
						<div
							key={draft.id}
							role="link"
							tabIndex={0}
							onClick={() => handleOpenDraft(draft.title)}
							onKeyDown={(event) => {
								if (
									event.key === 'Enter' ||
									event.key === ' '
								) {
									event.preventDefault();
									handleOpenDraft(draft.title);
								}
							}}
							className="card-interactive flex items-center gap-4 p-3 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
						>
							{draft.coverSrc ? (
								<img
									src={draft.coverSrc}
									alt={draft.title}
									className="h-16 w-24 rounded object-cover bg-bg-secondary"
								/>
							) : null}
							<div className="min-w-0 flex-1">
								<div className="truncate font-medium">
									{draft.title}
								</div>
								<div className="mt-1 text-xs text-text-muted">
									{formatDurationMs(draft.totalDuration)}
								</div>
							</div>
							<button
								type="button"
								onClick={(event) => {
									event.stopPropagation();
									handleDeleteDraft(draft.id);
								}}
								onKeyDown={(event) => event.stopPropagation()}
								className="btn btn-danger btn-sm h-10 w-10 px-0"
								aria-label={`Delete ${draft.title}`}
							>
								<Icon name="delete" className="text-error" />
								<span className="sr-only">Delete</span>
							</button>
						</div>
					))}
				</div>
			)}

			<ConfirmDialog
				open={deletingDraftId !== null}
				title="Delete draft"
				message="This will permanently delete the draft. Are you sure you want to continue?"
				confirmLabel="Delete"
				cancelLabel="Cancel"
				loading={isDeleting}
				onConfirm={confirmDeleteDraft}
				onCancel={cancelDeleteDraft}
			/>

			<div className="flex-center mt-4">
				<button
					type="button"
					onClick={handleCreateDraft}
					disabled={isCreating}
					className="btn btn-ghost rounded-full mb-4 h-12 w-12"
					aria-label="Create new draft video"
				>
					<Icon name="plus" className="text-text-primary" />
				</button>
			</div>
		</div>
	);
}

export default EditorLibraryPage;
