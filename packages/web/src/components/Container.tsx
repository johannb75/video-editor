import React, { useEffect, useRef, useState } from "react";
import { useRecoilValue } from "recoil";

// Helpers
import { AppScreens, pageState } from "../helpers/atoms";

// Pages
import { DrawPage } from "../pages/Draw";
import { InitialPage } from "../pages/Initial";
import { TextPage } from "../pages/Text";

// Components
import EditCanvas, { IEditCanvasRef } from "./Canvas";
import BackgroundVideo from "./Video";

interface Props {}

export const Container: React.FC<Props> = (props) => (
	<div id="video_editor_canvas_container_1">
		<Content />
	</div>
);

const Content: React.FC = () => {
	const [started, setStart] = useState<boolean>(false);
	const [loading, setLoading] = useState<boolean>(true);

	const canvasRef = useRef<IEditCanvasRef>(null);
	const videoRef = useRef<HTMLVideoElement>(null);

	const page = useRecoilValue(pageState);

	const load = () => {
		setLoading(false);
	};

	const start = () => {
		return setStart(true);
	};

	useEffect(() => {
		load();
	}, []);

	if (loading) return <span className="text-white">Loading...</span>;

	if (!started) return <button onClick={start}>Start</button>;

	return (
		<>
			<div>
				<BackgroundVideo ref={videoRef} />
				<EditCanvas ref={canvasRef} videoRef={videoRef} />
			</div>
			<div style={{ position: "relative", zIndex: 3 }}>
				{page === AppScreens.INITIAL ? (
					<InitialPage canvasRef={canvasRef} videoRef={videoRef} />
				) : page === AppScreens.DRAW ? (
					<DrawPage canvasRef={canvasRef} />
				) : page === AppScreens.TEXT ? (
					<TextPage canvasRef={canvasRef} />
				) : null}
			</div>
		</>
	);
};
