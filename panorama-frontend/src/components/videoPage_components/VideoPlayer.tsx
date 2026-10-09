import { memo } from 'react';
import { Video } from '../video_components';
import type { VideoData } from '../../types/video';

const VideoPlayer = memo(function VideoPlayer({
	data,
}: {
	data: VideoData;
}) {
	return <Video data={data} />;
});

export default VideoPlayer;
