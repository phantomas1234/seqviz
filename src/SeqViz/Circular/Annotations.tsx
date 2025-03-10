import * as React from "react";

import { Annotation, Coor, ISize, InputRefFuncType } from "../../elements";
import { COLOR_BORDER_MAP, darkerColor } from "../../utils/colors";
import CentralIndexContext from "../handlers/centralIndex";

interface AnnotationsProps {
  annotations: Annotation[][];
  center: Coor;
  findCoor: (index: number, radius: number, rotate?: boolean) => Coor;
  generateArc: (args: {
    arrowFWD?: boolean;
    arrowREV?: boolean;
    innerRadius: number;
    largeArc: boolean;
    length: number;
    offset?: number;
    outerRadius: number;
    // see svg.arc large-arc-flag
    sweepFWD?: boolean;
  }) => string;
  getRotation: (index: number) => string;
  inlinedAnnotations: string[];
  inputRef: InputRefFuncType;
  lineHeight: number;
  radius: number;
  rotateCoor: (coor: Coor, degrees: number) => Coor;
  rowsToSkip: number;
  seqLength: number;
  size: ISize;
}

/**
 * Used to build up all the path elements. Does not include a display
 * of the annotation name or a line connecting name to annotation
 *
 * Annotations might overlap with one another. To avoid that, annotations are first moved into rows -- non-overlapping
 * arrays or annotation arrays -- and then used to create the array of array of annotation paths.
 */
export default class Annotations extends React.PureComponent<AnnotationsProps> {
  /** during an annotation hover event, darken all other pieces of the same annotation */
  hoverAnnotation = (className: string, opacity: number) => {
    const elements = document.getElementsByClassName(className);
    for (let i = 0; i < elements.length; i += 1) {
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'style' does not exist on type 'Element'.
      elements[i].style.fillOpacity = opacity;
    }
  };

  render() {
    const { annotations, lineHeight, radius, rowsToSkip } = this.props;

    // at least 3 rows inward from default radius (ie index row)
    const rowShiftHeight = lineHeight * rowsToSkip;
    const radiusAdjust = lineHeight * 3;
    let currBRadius = radius - radiusAdjust - rowShiftHeight;
    let currTRadius = currBRadius - lineHeight; // top radius

    return (
      <CentralIndexContext.Consumer>
        {({ circular }) => (
          <g className="la-vz-circular-annotations">
            {annotations.reduce((acc: any[], anns: Annotation[], i) => {
              if (i) {
                currBRadius -= lineHeight + 3;
                currTRadius -= lineHeight + 3;
              } // increment the annRow radii if on every loop after first

              return acc.concat(
                anns.map(ann => (
                  <SingleAnnotation
                    key={`la-vz-${ann.id}-annotation-circular-row`}
                    annotation={ann}
                    calcBorderColor={darkerColor}
                    centralIndex={circular}
                    currBRadius={currBRadius}
                    currTRadius={currTRadius}
                    generateArc={this.props.generateArc}
                    getRotation={this.props.getRotation}
                    hoverAnnotation={this.hoverAnnotation}
                    id={`la-vz-${ann.id}-annotation-circular-row`}
                    inlinedAnnotations={this.props.inlinedAnnotations}
                    inputRef={this.props.inputRef}
                    lineHeight={lineHeight}
                    seqLength={this.props.seqLength}
                  />
                ))
              );
            }, [])}
          </g>
        )}
      </CentralIndexContext.Consumer>
    );
  }
}

interface SingleAnnotationProps {
  annotation: Annotation;
  calcBorderColor: (c: any) => any;
  centralIndex: number;
  currBRadius: number;
  currTRadius: number;
  generateArc: (args: {
    arrowFWD?: boolean;
    arrowREV?: boolean;
    innerRadius: number;
    largeArc: boolean;
    length: number;
    offset?: number;
    outerRadius: number;
    // see svg.arc large-arc-flag
    sweepFWD?: boolean;
  }) => string;
  getRotation: (index: number) => string;
  hoverAnnotation: (className: string, opacity: number) => void;
  id: string;
  inlinedAnnotations: string[];
  inputRef: InputRefFuncType;
  lineHeight: number;
  seqLength: number;
}

/**
 * A component for a single annotation within the Circular Viewer
 *
 */
const SingleAnnotation = (props: SingleAnnotationProps) => {
  const {
    annotation: a,
    calcBorderColor,
    centralIndex,
    currBRadius,
    currTRadius,
    generateArc,
    getRotation,
    hoverAnnotation,
    inlinedAnnotations,
    inputRef,
    lineHeight,
    seqLength,
  } = props;

  // if it crosses the zero index, correct for actual length
  let annLength = a.end >= a.start ? a.end - a.start : seqLength - a.start + a.end;

  // can't make an arc from a full circle
  annLength = annLength === 0 ? seqLength - 0.1 : annLength;

  // how many degrees should it be rotated?
  const rotation = getRotation(a.start);

  if (currBRadius < 0 || currTRadius < 0) {
    return null;
  }

  //is name in top or bottom half?
  const mid = (annLength / 2 + a.start + seqLength - centralIndex) % seqLength;
  const bottomHalf = mid > seqLength * 0.25 && mid < seqLength * 0.75;

  const path = generateArc({
    arrowFWD: a.direction === 1,
    arrowREV: a.direction === -1,
    innerRadius: currBRadius,
    largeArc: annLength > seqLength / 2,
    length: annLength,
    outerRadius: currTRadius,
    sweepFWD: true,
  });
  const namePath = generateArc({
    arrowFWD: false,
    arrowREV: false,
    innerRadius: bottomHalf ? currBRadius : currTRadius,
    largeArc: annLength > seqLength / 2,
    length: annLength,
    outerRadius: bottomHalf ? currBRadius : currTRadius,
    sweepFWD: true,
  });

  const circAnnID = `la-vz-${a.id}-circular`;
  return (
    <g id={`la-vz-${a.id}-annotation-circular`} transform={rotation}>
      <path d={namePath} fill="transparent" id={circAnnID} stroke="transparent" />
      <path
        ref={inputRef(a.id, {
          direction: a.direction,
          end: a.end,
          name: a.name,
          ref: a.id,
          start: a.start,
          type: "ANNOTATION",
        })}
        className={a.id}
        d={path}
        id={a.id}
        style={{
          cursor: "pointer",
          fill: a.color,
          fillOpacity: 0.7,
          shapeRendering: "geometricPrecision",
          stroke: a.color ? COLOR_BORDER_MAP[a.color] || calcBorderColor(a.color) : "gray",
          strokeLinejoin: "round",
          strokeWidth: a.type === "insert" ? 2.4 : 0.5,
        }}
        onBlur={() => {}}
        onFocus={() => {}}
        onMouseOut={() => hoverAnnotation(a.id, 0.7)}
        onMouseOver={() => hoverAnnotation(a.id, 1.0)}
      />
      {inlinedAnnotations.includes(a.id) && (
        <text
          dy={-0.4 * lineHeight}
          id={a.id}
          onBlur={() => {}}
          onFocus={() => {}}
          onMouseOut={() => hoverAnnotation(a.id, 0.7)}
          onMouseOver={() => hoverAnnotation(a.id, 1.0)}
        >
          <textPath
            cursor="pointer"
            dominantBaseline="middle"
            id={a.id}
            startOffset={bottomHalf ? "25%" : "75%"}
            textAnchor="middle"
            xlinkHref={`#${circAnnID}`}
          >
            {a.name}
          </textPath>
        </text>
      )}
    </g>
  );
};
