import numpy as np
from typing import Dict, Any, List, Optional
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    roc_auc_score
)


def calculate_metrics(
    y_true: List[int],
    y_pred: List[int],
    y_prob: Optional[List[float]] = None,
    class_names: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Computes comprehensive evaluation metrics: Accuracy, Precision, Recall, F1-Score,
    Confusion Matrix, and ROC-AUC (for binary/multiclass).
    """
    if class_names is None:
        class_names = ["NORMAL", "PNEUMONIA"]

    y_true_np = np.array(y_true)
    y_pred_np = np.array(y_pred)

    acc = float(accuracy_score(y_true_np, y_pred_np))
    prec = float(precision_score(y_true_np, y_pred_np, average="binary", zero_division=0))
    rec = float(recall_score(y_true_np, y_pred_np, average="binary", zero_division=0))
    f1 = float(f1_score(y_true_np, y_pred_np, average="binary", zero_division=0))

    cm = confusion_matrix(y_true_np, y_pred_np).tolist()

    roc_auc = None
    if y_prob is not None:
        try:
            y_prob_np = np.array(y_prob)
            if len(y_prob_np.shape) > 1 and y_prob_np.shape[1] == 2:
                # Binary probabilities column 1
                roc_auc = float(roc_auc_score(y_true_np, y_prob_np[:, 1]))
            else:
                roc_auc = float(roc_auc_score(y_true_np, y_prob_np))
        except Exception:
            roc_auc = None

    return {
        "accuracy": round(acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1_score": round(f1, 4),
        "confusion_matrix": cm,
        "roc_auc": round(roc_auc, 4) if roc_auc is not None else None,
        "class_names": class_names,
    }
