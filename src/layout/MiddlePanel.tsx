import { View } from "../types/view";
import MasteryTracker from "../views/MasteryTracker";
import PrimeJunk from "../views/PrimeJunk";
import "./MiddlePanel.css";

type Props = {
  activeView: View;
};

export default function MiddlePanel({activeView}: Props) {
    const CurrentView = {
        "mastery-checklist": MasteryTracker,
        "prime-junk": PrimeJunk,
    }[activeView];

    return (
        <div className="middle-panel">
            <CurrentView />
        </div>
    )
}