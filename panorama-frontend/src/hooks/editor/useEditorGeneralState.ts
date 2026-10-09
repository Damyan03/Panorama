import { useCallback } from 'react';
import {
	type DraftSetter,
	setVideoField,
} from '../../utils/editor/draftMutations';

type UseEditorGeneralStateParams = {
	setVideoDraft: DraftSetter;
};

export function useEditorGeneralState({
	setVideoDraft,
}: UseEditorGeneralStateParams) {
	const handleUpdateVideoTitle = useCallback(
		(nextTitle: string) => {
			setVideoField(setVideoDraft, 'title', nextTitle);
		},
		[setVideoDraft],
	);

	const handleUpdateVideoCoverUrl = useCallback(
		(nextCoverUrl: string) => {
			setVideoField(setVideoDraft, 'coverSrc', nextCoverUrl);
		},
		[setVideoDraft],
	);

	const handleUpdateVideoDescription = useCallback(
		(nextDescription: string) => {
			setVideoField(
				setVideoDraft,
				'description',
				nextDescription,
			);
		},
		[setVideoDraft],
	);

	return {
		handleUpdateVideoTitle,
		handleUpdateVideoCoverUrl,
		handleUpdateVideoDescription,
	};
}
