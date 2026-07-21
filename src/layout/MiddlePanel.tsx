import { View } from "../types/view";
import Foundry from "../views/Foundry";
import MasteryTracker from "../views/MasteryTracker";
import PrimeParts from "../views/PrimeParts";
import "./MiddlePanel.css";

type Props = {
  activeView: View;
};

export default function MiddlePanel({activeView}: Props) {
    const CurrentView = {
        "mastery-checklist": MasteryTracker,
        "prime-parts": PrimeParts,
        "foundry": Foundry,
    }[activeView];

    return (
        <div className="middle-panel">
            <CurrentView />
        </div>
    )
}