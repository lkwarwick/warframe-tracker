import { View } from "../types/view";
import "./MiddlePanel.css";

type Props = {
  activeView: View;
};

export default function MiddlePanel({activeView}: Props) {
    return (
        <div className="middle-panel">
            <h2>{activeView}</h2>
        </div>
    )
}