"""Bridge between list[float] indicator inputs and pandas Series used by pandas-ta-classic."""
from typing import Optional

import numpy as np
import pandas as pd


def to_series(values: list[Optional[float]]) -> pd.Series:
    """Convert a list of floats (None → NaN) to a pandas Series."""
    return pd.Series([np.nan if v is None else v for v in values], dtype=float)


def from_series(s: Optional[pd.Series], n: int) -> list[Optional[float]]:
    """Convert a pandas Series to a list of length n, replacing NaN with None.

    n: expected output length (= length of the original input list).
       If s is None (pandas-ta returns None when input is too short), returns [None]*n.
       Reindexes to range(n) so trimmed series (e.g. stochastic) are padded with None.
    """
    if s is None:
        return [None] * n
    s = s.reindex(range(n))
    return [None if (v is None or (isinstance(v, float) and np.isnan(v))) else float(v) for v in s]
