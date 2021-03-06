import React, { useEffect, useImperativeHandle, useRef } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import { v4 as uuidv4 } from "uuid";

// Fabric JS
import { fabric } from "fabric-with-gestures";
import "fabric-history";

// Brushes
import { PSBrush } from "@arch-inc/fabricjs-psbrush";
import { EraserBrush } from "../helpers/fabircEraserBursh";

// Helpers
import {
	variablesState,
	lineOptionsState,
	scriptState,
	IVariables,
} from "../helpers/atoms";
import { IScripting } from "../helpers/types/scripting";

interface Props {
	onTextDoubleClick?: (obj: any) => any;
	videoRef: React.RefObject<HTMLVideoElement>;
}

type TFabricRef = fabric.Canvas | undefined;
type TCanvasRef = HTMLCanvasElement | null;

export interface IEditCanvasRef {
	clear?: () => void;
	undo?: () => void;
	redo?: () => void;
	addText: (text: string) => string;
	getObject: (id: string) => fabric.Object | undefined;
	getFabric: () => TFabricRef;
	getCanvas: () => TCanvasRef;
}

const EditCanvas = React.forwardRef<IEditCanvasRef, Props>(
	({ onTextDoubleClick, videoRef }, ref) => {
		const lineOptions = useRecoilValue(lineOptionsState);
		const [script, setScript] = useRecoilState(scriptState);
		const [variables, setVariables] = useRecoilState(variablesState);

		const variablesRef = useRef<IVariables>();
		const scriptRef = useRef<IScripting>({});

		const canvasRef = useRef<HTMLCanvasElement>(null);
		const fabricCanvasRef = useRef<fabric.Canvas>();

		const resizeCanvas = () => {
			const w = window.innerWidth;
			const h = window.innerHeight;

			if (!canvasRef.current || !fabricCanvasRef.current) return;

			canvasRef.current.width = window.innerWidth;
			canvasRef.current.height = window.innerHeight;

			fabricCanvasRef.current.setWidth(w);
			fabricCanvasRef.current.setHeight(h);
			fabricCanvasRef.current.calcOffset();
		};

		const getObject = (id: string) => {
			const objects = fabricCanvasRef.current?.getObjects() ?? [];

			for (let i = 0; i < objects.length; i++) {
				const object = objects[i];
				if (object?.id === id) return object;
			}
		};

		useImperativeHandle(ref, () => ({
			clear: () => fabricCanvasRef.current?.clear(),
			undo: () => fabricCanvasRef.current?.undo?.(),
			redo: () => fabricCanvasRef.current?.redo?.(),
			addText: (text) => {
				const id = uuidv4();
				const textbox = new fabric.IText(text, {
					id,
					textAlign: "center",
					fill: "black",
					textBackgroundColor: "white",
					fontWeight: 700,
					fontFamily: "Arial",
				});

				fabricCanvasRef.current?.add(textbox);
				textbox.center();
				return id;
			},
			getFabric: () => fabricCanvasRef.current,
			getCanvas: () => canvasRef.current,
			getObject,
		}));

		useEffect(() => {
			variablesRef.current = variables;
			scriptRef.current = script;
		}, [variables, script]);

		useEffect(() => {
			if (fabricCanvasRef.current)
				fabricCanvasRef.current.isDrawingMode = variables.isDrawing;
		}, [variables.isDrawing]);

		useEffect(() => {
			if (!fabricCanvasRef.current) return;
			if (variables.erasing) {
				fabricCanvasRef.current.freeDrawingBrush = new EraserBrush(
					fabricCanvasRef.current
				);
				fabricCanvasRef.current.freeDrawingBrush.color = "#FF0000";
				fabricCanvasRef.current.freeDrawingBrush.width = 20;
			} else {
				fabricCanvasRef.current.freeDrawingBrush = new PSBrush(
					fabricCanvasRef.current
				);
				fabricCanvasRef.current.freeDrawingBrush.color =
					lineOptions.color;
				fabricCanvasRef.current.freeDrawingBrush.width =
					lineOptions.size;
				fabricCanvasRef.current.freeDrawingBrush.globalCompositeOperation =
					"destination-over";
			}
		}, [variables.erasing]);

		useEffect(() => {
			if (
				fabricCanvasRef.current &&
				lineOptions.color &&
				!variables.erasing
			)
				fabricCanvasRef.current.freeDrawingBrush.color =
					lineOptions.color;
		}, [lineOptions.color]);

		useEffect(() => {
			if (fabricCanvasRef.current && lineOptions.size)
				fabricCanvasRef.current.freeDrawingBrush.width =
					lineOptions.size;
		}, [lineOptions.size]);

		useEffect(() => {
			// init fabric.js
			const canvas = (fabricCanvasRef.current = new fabric.Canvas(
				canvasRef.current
			));

			// init pressure brush
			const brush = new PSBrush(canvas);
			brush.color = lineOptions.color;
			brush.width = lineOptions.size;
			canvas.freeDrawingBrush = brush;

			resizeCanvas();
			window.addEventListener("resize", resizeCanvas, false);

			// TODO: handle events (onTextDoubleClick)
			canvas.on("object:added", (opt) => {
				const id = uuidv4();

				setScript((script) => {
					const { pinnedFrame = 1 } = variablesRef.current!;
					let script_clone = { ...script };
					let t = script_clone[pinnedFrame];
					const next_frame = 5;
					let t2 = script_clone[pinnedFrame + next_frame];

					script_clone[pinnedFrame] = {
						...t,
						show: [...(t?.show ?? []), id],
					};

					script_clone[pinnedFrame + next_frame] = {
						...t2,
						hide: [...(t2?.hide ?? []), id],
					};

					return script_clone;
				});

				if (opt.path) {
					opt.path.id = id;
					opt.path.hasControls = false;
					opt.path.dirty = true;
				} else if (opt.target) {
					opt.target.id = id;
					opt.target.hasControls = false;
					opt.target.dirty = true;
				}
			});

			return () => {
				window.removeEventListener("resize", resizeCanvas, false);
				canvas.removeListeners();
			};
		}, []);

		useEffect(() => {
			/** Request Animation Frame on specific FPS */
			const requestAnimFrame = () => requestAnimationFrame(animate);

			const animate = () => {
				const script = scriptRef.current;
				const { pinnedFrame, playVideo } = variablesRef.current!;

				if (!playVideo || pinnedFrame)
					return requestAnimationFrame(animate);

				const frame =
					Math.round(
						videoRef.current?.currentTime! * variables.FPS
					) ?? 1;

				const frame_script = script[frame];

				if (!frame_script) return requestAnimFrame();

				for (let to_hide of frame_script.hide || []) {
					const obj = getObject(to_hide);
					if (!obj) continue;
					obj.set("opacity", 0);
				}

				for (const to_show of frame_script.show || []) {
					const obj = getObject(to_show);
					if (!obj) continue;
					obj.set("opacity", 1);
				}
				fabricCanvasRef.current?.renderAll();

				return requestAnimFrame();
			};

			requestAnimationFrame(animate);
		}, []);

		return (
			<div
				style={{
					width: "100%",
					height: "100%",
					position: "absolute",
					zIndex: 2,
				}}
			>
				<canvas ref={canvasRef} />
			</div>
		);
	}
);

EditCanvas.displayName = "EditCanvas";

export default EditCanvas;
