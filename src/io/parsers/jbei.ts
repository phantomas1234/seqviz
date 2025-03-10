import * as xml2js from "xml2js";

import { Part } from "../../elements";
import { colorByIndex } from "../../utils/colors";
import { dnaComplement, partFactory } from "../../utils/parser";
import randomid from "../../utils/randomid";

/**
 * takes a JBEI file, as a string, and converts it to a Part.
 * An example of this type of file can be found in ../examples/jbei
 */
export default async (JBEI: string, _: string[] = []): Promise<Part[]> =>
  new Promise((resolve, reject) => {
    // util reject function that will be triggered if any fields fail
    const rejectJBEI = errType => reject(new Error(`Failed on JBEI file; ${errType}`));

    // weird edge case with directed quotation characters
    const fileString = JBEI.replace(/“|”/g, '"');

    xml2js.parseString(
      fileString,
      {
        attrkey: "xml_tag",
        tagNameProcessors: [xml2js.processors.stripPrefix],
        xmlns: true,
      },
      (err, parsedJBEI) => {
        if (err) rejectJBEI(err);

        // destructure the paramaeters from JBEI
        const { seq } = parsedJBEI;
        const { features, name, sequence } = seq;

        // attempt to get the name out of the JBEI
        let parsedName = "Unnamed";
        if (name && name[0] && name[0]._) {
          parsedName = name[0]._;
        }

        // attempt to get the sequence. fail if it's not findable
        let parsedSeq = "";
        if (sequence && sequence[0] && sequence[0]._) {
          parsedSeq = sequence[0]._;
        }
        const { compSeq: parsedCompSeq, seq: parsedSeq2 } = dnaComplement(parsedSeq); // seq and compSeq
        if (!parsedSeq2) return null;

        // attempt to parse the JBEI annotations into our version of annotations
        const annotations = [];
        if (features && features[0] && features[0].feature) {
          features[0].feature.forEach((feature, i) => {
            if (!feature) return;

            const { label = [{}], type = [{}], complement = [{}], location = [] } = feature;
            if (location && location[0] && location[0].genbankStart && location[0].end) {
              annotations.push({
                // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'.
                color: colorByIndex(i),

                // @ts-expect-error ts-migrate(2322) FIXME: Type 'number' is not assignable to type 'never'.
                direction: complement[0]._ === "true" ? -1 : 1,

                // JBEI is 1-based
                // @ts-expect-error ts-migrate(2322) FIXME: Type 'number' is not assignable to type 'never'.
                end: +location[0].end[0]._ || 0,

                // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'.
                id: randomid(),

                // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
                name: label[0]._ || "Untitled",

                // @ts-expect-error ts-migrate(2322) FIXME: Type 'number' is not assignable to type 'never'.
                start: +location[0].genbankStart[0]._ - 1 || 0,

                // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
                type: type[0]._ || "N/A",
              });
            }
          });
        }

        resolve([
          {
            ...partFactory(),
            annotations: annotations,
            compSeq: parsedCompSeq,
            name: parsedName,
            seq: parsedSeq2,
          },
        ]);
      }
    );
  });
