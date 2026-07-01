import plantStage2 from "../assets/companions/plant-stage-2.png";

function CompanionMascot({ size = "medium", caption }) {
  return (
    <figure className={`companion-mascot companion-${size}`}>
      <div className="companion-body">
        <img src={plantStage2} alt="CutSmart companion" />
      </div>
      {caption && <figcaption className="companion-label">{caption}</figcaption>}
    </figure>
  );
}

export default CompanionMascot;
