package org.libprotection.injections.caching

import java.util.*

class FormatCacheItem(val format : String, val args : Array<out Any?>){

    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as FormatCacheItem

        if (format != other.format) return false
        if (!Arrays.equals(args, other.args)) return false

        return true
    }

    override fun hashCode(): Int {
        var result = format.hashCode()
        result = 31 * result + Arrays.hashCode(args)
        return result
    }
}