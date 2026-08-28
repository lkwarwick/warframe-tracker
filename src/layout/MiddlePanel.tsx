import { View } from "../types/view";
import Foundry from "../views/Foundry";
import "./MiddlePanel.css";

type Props = {
  activeView: View;
};

export default function MiddlePanel({activeView}: Props) {
    const CurrentView = {
        "foundry": Foundry,
    }[activeView];

    return (
        <div className="middle-panel">
            <CurrentView />
        </div>
    )
}